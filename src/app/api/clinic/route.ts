import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  AppointmentNotFoundError,
  AppointmentTimeError,
  getClinicData,
  savePatient,
  deletePatient,
  saveAppointment,
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
  appointmentSchema,
  rescheduleSchema,
  feeSchema,
  paymentSchema,
  clinicProfileSchema,
} from "@/lib/validations/clinic";

export const dynamic = "force-dynamic";
export const maxDuration = 10; // Vercel Free Tier max function timeout

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const requestedEmail = searchParams.get("email");

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in to access clinic records." },
        { status: 401 }
      );
    }

    const targetEmail = session.user.email.toLowerCase().trim();
    if (requestedEmail && requestedEmail.toLowerCase().trim() !== targetEmail) {
      return NextResponse.json(
        { error: "Forbidden: You cannot access clinical records belonging to another dentist account." },
        { status: 403 }
      );
    }

    const state = await getClinicData(targetEmail);
    return NextResponse.json(state, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
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
    let email: string;
    if (session?.user?.email) {
      email = session.user.email.toLowerCase().trim();
    } else {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in with Google to modify clinic records." },
        { status: 401 }
      );
    }
    const doctorName = session?.user?.name || "Doctor";

    switch (action) {
      case "load_sample_data": {
        await seedSampleDataForDoctor(email, doctorName);
        break;
      }

      case "add_patient":
      case "update_patient": {
        const validated = patientSchema.parse(data);
        await savePatient({ ...validated, dentistEmail: email } as Patient, email);
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

      case "complete_appointment": {
        if (!appointmentId || typeof appointmentId !== "string") {
          return NextResponse.json({ error: "Valid appointment ID required" }, { status: 400 });
        }
        await updateAppointmentStatus(appointmentId, "completed", email);
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
        const validated = clinicProfileSchema.parse(data);
        await saveClinicProfile(validated as Partial<ClinicProfile>, email);
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown clinic action: ${action}` },
          { status: 400 }
        );
    }

    const updated = await getClinicData(email);
    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: `Validation error: ${err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}` },
        { status: 400 }
      );
    }
    const status =
      err instanceof AppointmentNotFoundError
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
