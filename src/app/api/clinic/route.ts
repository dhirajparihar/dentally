import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getClinicData,
  savePatient,
  saveAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
  saveFee,
  savePayment,
  seedSampleDataForDoctor,
  DEFAULT_DEMO_EMAIL,
} from "@/lib/db/repository";
import { Patient, Appointment, FeeItem, PaymentTransaction } from "@/lib/mockData";

export const dynamic = "force-dynamic";
export const maxDuration = 10; // Vercel Free Tier max function timeout

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const requestedEmail = searchParams.get("email") || session?.user?.email || DEFAULT_DEMO_EMAIL;

    const state = await getClinicData(requestedEmail);
    return NextResponse.json(state, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch clinic state" },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { action, data, appointmentId, date, time, reason, dentistEmail } = body;

    const email = (dentistEmail || session?.user?.email || DEFAULT_DEMO_EMAIL).toLowerCase().trim();
    const doctorName = session?.user?.name || "Doctor";

    switch (action) {
      case "load_sample_data": {
        await seedSampleDataForDoctor(email, doctorName);
        break;
      }

      case "add_patient":
      case "update_patient": {
        await savePatient({ ...(data as Patient), dentistEmail: email }, email);
        break;
      }

      case "book_appointment": {
        await saveAppointment({ ...(data as Appointment), dentistEmail: email }, email);
        break;
      }

      case "complete_appointment": {
        await updateAppointmentStatus(appointmentId, "completed", email);
        break;
      }

      case "cancel_appointment": {
        await updateAppointmentStatus(appointmentId, "cancelled", email);
        break;
      }

      case "reschedule_appointment": {
        await rescheduleAppointment(appointmentId, date, time, reason, email);
        break;
      }

      case "add_fee": {
        await saveFee({ ...(data as FeeItem), dentistEmail: email }, email);
        break;
      }

      case "record_payment": {
        await savePayment({ ...(data as PaymentTransaction), dentistEmail: email }, email);
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown clinic action: ${action}` },
          { status: 400, headers: corsHeaders }
        );
    }

    const updated = await getClinicData(email);
    return NextResponse.json(updated, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process clinic action" },
      { status: 500, headers: corsHeaders }
    );
  }
}
