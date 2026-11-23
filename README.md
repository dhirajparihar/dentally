# 🦷 Dentally — AI Operating System for Dentists

> **Dedicated to Patients, Appointments, and Fees/Collections through Model Context Protocol (MCP) and ChatGPT.**

---

## 🎯 Platform Focus

Dentally is streamlined strictly around a single dentist's daily practice operations:
1. **Patients Management** (Registration, lookup, EHR, consultation notes, visit histories, outstanding balances)
2. **Appointments Management** (Daily schedule, upcoming visits, available slots, booking, rescheduling, cancellations, missed appointments)
3. **Fees & Payment History** (Treatment fee entries, payments received across UPI/Cash/Card, daily & monthly collections, discounts, receipts)
4. **Dentist Daily Assistant** (Natural language AI queries in ChatGPT)

---

## ⚡ MCP Toolset Matrix

### 1. Patient Management Tools
* `add_patient`: Register a new patient
* `search_patient`: Find a patient by name, phone or ID
* `get_patient_details`: View complete patient details
* `update_patient`: Update patient information
* `get_patient_history`: View previous visits and treatments
* `get_patient_notes`: View clinical notes for an existing visit
* `add_patient_notes`: Add a clinical note to an existing visit
* `update_patient_notes`: Edit a clinical note on an existing visit
* `get_patient_fees_history`: View patient's complete fee history
* `get_patient_appointment_history`: View all previous and upcoming appointments
* `get_patient_balance`: Check outstanding patient balance

### 2. Appointment Management Tools
* `book_appointment`: Book a new appointment
* `get_appointments`: View appointments
* `get_today_appointments`: View today's appointments
* `get_upcoming_appointments`: View future appointments
* `check_available_slots`: Check available appointment slots
* `reschedule_appointment`: Change appointment date or time
* `cancel_appointment`: Cancel an appointment
* `complete_appointment`: Mark appointment completed
* `get_missed_appointments`: Find missed appointments

### 3. Fees and Payment History Tools
* `add_fee`: Add a consultation or treatment fee
* `get_fee_details`: View fee details
* `update_fee`: Update an eligible fee entry
* `record_payment`: Record patient payment
* `get_payment_history`: View payment transactions
* `get_pending_fees`: Find unpaid fees
* `apply_discount`: Apply a discount
* `generate_fee_receipt`: Generate payment receipt
* `get_daily_collection`: View daily fee collection (UPI, Cash, Card)
* `get_monthly_collection`: View monthly fee collection
* `refund_payment`: Record an authorized refund

### 4. Dentist Daily Assistant Tools
* `get_daily_summary`: Today's appointments and collections
* `search_patient_by_phone`: Quickly find a patient
* `get_patients_with_pending_fees`: Find patients with outstanding fees
* `get_patients_due_for_followup`: Find patients due for another visit
* `get_patient_summary`: Summarize patient, appointments and fees
* `get_monthly_clinic_summary`: Monthly patient, appointment and collection summary

---

## 💬 Example AI Conversations Supported

* **Patient Search**: *"Find Rahul Sharma"* ➔ Returns demographics, past visits, and outstanding balance.
* **Appointments**: *"Show my appointments today"* ➔ Returns today's appointment list with times and procedures.
* **Fees History**: *"How much has Rahul paid so far?"* ➔ Returns total billed amount, payments received, discounts, and balance.
* **Daily Collection**: *"What is today's total collection?"* ➔ Returns today's payment collection separated by UPI, Cash, and Card.

---

## 🏃 Quick Start

* **Landing Page**: `http://localhost:3000`
* **Dentist Daily Assistant**: `http://localhost:3000/dashboard`
* **Patients Hub**: `http://localhost:3000/dashboard/patients`
* **Appointments Calendar**: `http://localhost:3000/dashboard/appointments`
* **Fees & Collections**: `http://localhost:3000/dashboard/fees`
* **ChatGPT MCP Hub**: `http://localhost:3000/dashboard/mcp`
* **MCP Server Endpoint**: `http://localhost:3000/api/mcp`

Open **Patients → patient profile → Visits → Clinical Notes** on a completed visit to view, add, or edit its notes. MCP note tools require an `appointmentId` from `get_patient_appointment_history`. Editing also requires the note's ID from `get_patient_notes`.

You can leave the State Dental Council / DCI registration number blank during first-time clinic setup and add it later in Clinic Settings.

In **Clinic Settings → Online Booking**, enable booking, choose the visit type and duration, and save. Copy the clinic link to share it with patients. The link uses the clinic's working hours and lets you block specific dates. Replacing the link disables the previous URL.

Patients can book as new or existing patients for the next 30 calendar days in India Standard Time. Existing patients enter their name and mobile number. Confirmed visits and their booking references appear in the clinic calendar. Patients can call the clinic to cancel or reschedule.

New patients who register through the booking link use a 10-digit Indian mobile number. The form accepts a `+91` prefix and common separators and saves the 10 digits. In **Patients**, select **Registered online** to filter or **Online First** to sort. In **Appointments**, select **Booked online** in either view or **Online First** in the all-bookings view.

The patient filter uses registration source recorded for new online sign-ups. The appointment filter also includes earlier bookings made through the clinic link.

Use **Copy URL** in the ChatGPT MCP Hub. In ChatGPT, go to **Plugins → + → Add custom MCP server** and paste it into **Server URL**.

The floating ChatGPT icon in the clinic workspace opens ChatGPT in a new tab. The Blossom logo belongs to OpenAI. [OpenAI brand guidelines](https://openai.com/brand/)
