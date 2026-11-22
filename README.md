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

## ⚡ MCP Toolset Matrix (36 Tools)

### 1. Patient Management Tools
* `add_patient`: Register a new patient
* `search_patient`: Find a patient by name, phone or ID
* `get_patient_details`: View complete patient details
* `update_patient`: Update patient information
* `get_patient_history`: View previous visits and treatments
* `get_patient_notes`: View dentist's notes
* `add_patient_notes`: Add consultation notes
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

You can leave the State Dental Council / DCI registration number blank during first-time clinic setup and add it later in Clinic Settings.

After connecting Dentally to ChatGPT, use **Copy Prompt** and **Open ChatGPT** in the MCP Hub. Select `@Dentally` in ChatGPT and paste the prompt.

The floating ChatGPT icon opens ChatGPT in a new tab from any Dentally page. The Blossom logo belongs to OpenAI. [OpenAI brand guidelines](https://openai.com/brand/)
