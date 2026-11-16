import { NextRequest, NextResponse } from "next/server";
import {
  getClinicData,
  savePatient,
  saveAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
  saveFee,
  savePayment,
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

export async function GET() {
  try {
    const state = await getClinicData();
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
    const body = await request.json();
    const { action, data, appointmentId, date, time, reason } = body;

    switch (action) {
      case "add_patient":
      case "update_patient": {
        await savePatient(data as Patient);
        break;
      }

      case "book_appointment": {
        await saveAppointment(data as Appointment);
        break;
      }

      case "complete_appointment": {
        await updateAppointmentStatus(appointmentId, "completed");
        break;
      }

      case "cancel_appointment": {
        await updateAppointmentStatus(appointmentId, "cancelled");
        break;
      }

      case "reschedule_appointment": {
        await rescheduleAppointment(appointmentId, date, time, reason);
        break;
      }

      case "add_fee": {
        await saveFee(data as FeeItem);
        break;
      }

      case "record_payment": {
        await savePayment(data as PaymentTransaction);
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown clinic action: ${action}` },
          { status: 400, headers: corsHeaders }
        );
    }

    const updated = await getClinicData();
    return NextResponse.json(updated, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process clinic action" },
      { status: 500, headers: corsHeaders }
    );
  }
}
