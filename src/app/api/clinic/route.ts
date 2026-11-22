import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { bookPatientAppointment, PatientIdentityError } from "@/lib/bookPatientAppointment";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { clinicOnboardingSchema } from "@/lib/clinicOnboarding";
import { ClinicAccessError, completeClinicOnboarding, getClinicOnboardingStatus, requireCompletedClinic } from "@/lib/db/clinicOnboarding";
import {
  AppointmentNotFoundError,
  AppointmentTimeError,
  getClinicData,
  savePatient,
  deletePatient,
  saveAppointment,
  saveVisitNote,
  updateAppointmentStatus,
  rescheduleAppointment,
  saveFee,
  savePayment,
  saveClinicProfile,
  seedSampleDataForDoctor,
} from "@/lib/db/repository";
import { Patient, Appointment, FeeItem, ClinicProfile } from "@/lib/mockData";
import {
  patientSchema,
  patientUpdateSchema,
  appointmentSchema,
  rescheduleSchema,
  feeSchema,
  paymentSchema,
  clinicProfileSchema,
  visitNoteSchema,
  visitNoteUpdateSchema,
} from "@/lib/validations/clinic";

export const dynamic = "force-dynamic";
export const maxDuration = 10; // Vercel Free Tier max function timeout

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const requestedEmail = searchParams.get("email");

    const identity = z.email().safeParse(session?.user?.email?.trim().toLowerCase());
    if (!identity.success) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in to access clinic records." },
        { status: 401 }
      );
    }

    const targetEmail = identity.data;
    if (requestedEmail && requestedEmail.toLowerCase().trim() !== targetEmail) {
      return NextResponse.json(
        { error: "Forbidden: You cannot access clinical records belonging to another dentist account." },
        { status: 403 }
      );
    }

    const configured = await getClinicOnboardingStatus(targetEmail);
    const state = configured
      ? await getClinicData(targetEmail)
      : { patients: [], appointments: [], fees: [], payments: [], clinicProfile: { email: targetEmail, isConfigured: false } };
    if (configured && (!("storage" in state) || state.storage !== "mongodb" || !state.clinicProfile.isConfigured)) {
      throw new ClinicAccessError("Clinic details are unavailable. Please try again.", 503);
    }
    return NextResponse.json(state, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    if (err instanceof ClinicAccessError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json(
      { error: err.message || "Failed to fetch clinic state" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { action, data, appointmentId, patientId, date, time, reason } = body;

    // Secure Authorization:
    // Enforce mutations to the authenticated user's email only.
    const identity = z.email().safeParse(session?.user?.email?.trim().toLowerCase());
    if (!identity.success) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in with Google to modify clinic records." },
        { status: 401 }
      );
    }
    const email = identity.data;
    if (action === "complete_onboarding") {
      const setup = clinicOnboardingSchema.safeParse(data);
      if (!setup.success) {
        return NextResponse.json(
          { error: "Review the clinic details below.", fieldErrors: z.flattenError(setup.error).fieldErrors },
          { status: 400 }
        );
      }
      await completeClinicOnboarding(email, setup.data);
      return NextResponse.json({ success: true });
    }

    await requireCompletedClinic(email);
    const doctorName = session?.user?.name || "Doctor";
    let bookedAppointment: Appointment | undefined;

    switch (action) {
      case "load_sample_data": {
        await seedSampleDataForDoctor(email, doctorName);
        break;
      }

      case "add_patient":
      case "update_patient": {
        const validated = (action === "add_patient" ? patientSchema : patientUpdateSchema).parse(data);
        await savePatient({ ...validated, dentistEmail: email } as Patient, email, { requireExisting: action === "update_patient" });
        break;
      }

      case "delete_patient": {
        const idToDelete = patientId || data?.patientId;
        if (!idToDelete || typeof idToDelete !== "string") {
          return NextResponse.json({ error: "Valid patient ID required for deletion" }, { status: 400 });
        }
        await deletePatient(idToDelete, email);
        break;
      }

      case "book_appointment": {
        const validated = appointmentSchema.parse(data);
        await saveAppointment({ ...validated, dentistEmail: email } as Appointment, email);
        break;
      }

      case "book_patient_appointment": {
        bookedAppointment = await bookPatientAppointment(data, email);
        break;
      }

      case "complete_appointment": {
        if (!appointmentId || typeof appointmentId !== "string") {
          return NextResponse.json({ error: "Valid appointment ID required" }, { status: 400 });
        }
        await updateAppointmentStatus(appointmentId, "completed", email);
        break;
      }

      case "add_patient_notes":
      case "update_patient_notes": {
        const schema = action === "add_patient_notes" ? visitNoteSchema : visitNoteUpdateSchema;
        await saveVisitNote(schema.parse(data), email, doctorName);
        break;
      }

      case "cancel_appointment": {
        if (!appointmentId || typeof appointmentId !== "string") {
          return NextResponse.json({ error: "Valid appointment ID required" }, { status: 400 });
        }
        await updateAppointmentStatus(appointmentId, "cancelled", email, reason);
        break;
      }

      case "miss_appointment": {
        if (!appointmentId || typeof appointmentId !== "string") {
          return NextResponse.json({ error: "Valid appointment ID required" }, { status: 400 });
        }
        await updateAppointmentStatus(appointmentId, "missed", email, reason);
        break;
      }

      case "reschedule_appointment": {
        const validated = rescheduleSchema.parse({ appointmentId, date, time, reason });
        await rescheduleAppointment(
          validated.appointmentId,
          validated.date,
          validated.time,
          validated.reason,
          email
        );
        break;
      }

      case "add_fee": {
        const validated = feeSchema.parse(data);
        await saveFee({ ...validated, dentistEmail: email } as FeeItem, email);
        break;
      }

      case "record_payment": {
        const validated = paymentSchema.parse(data);
        await savePayment({ ...validated, dentistEmail: email }, email);
        break;
      }

      case "update_clinic_profile": {
        const validated = clinicProfileSchema.omit({ email: true, isConfigured: true }).parse(data);
        await saveClinicProfile({ ...validated, email } as Partial<ClinicProfile>, email);
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown clinic action: ${action}` },
          { status: 400 }
        );
    }

    const updated = await getClinicData(email);
    return NextResponse.json({ ...updated, bookedAppointment }, { status: 200 });
  } catch (err: any) {
    if (err instanceof ClinicAccessError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: `Validation error: ${err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}` },
        { status: 400 }
      );
    }
    const status =
      err instanceof PatientIdentityError
        ? 409
        : err instanceof AppointmentNotFoundError
        ? 404
        : err instanceof AppointmentTimeError
        ? 400
        : 500;
    return NextResponse.json(
      { error: err.message || "Failed to process clinic action" },
      { status }
    );
  }
}
