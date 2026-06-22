-- ====================================================================
-- OPD Management System Database Schema
-- ====================================================================

-- 0. Doctors Table
CREATE TABLE IF NOT EXISTS public.doctors (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    license_no TEXT UNIQUE NOT NULL,
    phone TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hn TEXT UNIQUE NOT NULL,
    citizen_id TEXT,
    passport_number TEXT,
    title TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT NOT NULL,
    date_of_birth DATE,
    phone_number TEXT NOT NULL,
    address TEXT NOT NULL,
    emergency_contact_name TEXT NOT NULL,
    emergency_contact_phone TEXT NOT NULL,
    medical_right TEXT NOT NULL,
    primary_doctor TEXT NOT NULL,
    allergy_note TEXT,
    chronic_disease_note TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    department TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked_in', 'cancelled', 'completed', 'no_show')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Queues Table
CREATE TABLE IF NOT EXISTS public.queues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    queue_number TEXT NOT NULL,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    department TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'elderly', 'vip')),
    status TEXT NOT NULL DEFAULT 'waiting_registration' CHECK (status IN ('waiting_registration', 'waiting_screening', 'waiting_doctor', 'in_consultation', 'waiting_payment', 'waiting_pharmacy', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    called_time TIMESTAMP WITH TIME ZONE,
    completed_time TIMESTAMP WITH TIME ZONE,
    cancelled_reason TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Medicine Deliveries Table
CREATE TABLE IF NOT EXISTS public.medicine_deliveries (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    delivery_type TEXT NOT NULL DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'post', 'rider', 'other')),
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    prescription_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'shipping', 'delivered', 'cancelled')),
    print_date DATE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- Performance Indexes
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_doctors_name ON public.doctors(name);
CREATE INDEX IF NOT EXISTS idx_doctors_license ON public.doctors(license_no);
CREATE INDEX IF NOT EXISTS idx_patients_hn ON public.patients(hn);
CREATE INDEX IF NOT EXISTS idx_patients_search ON public.patients(first_name, last_name, phone_number, citizen_id, passport_number);
CREATE INDEX IF NOT EXISTS idx_appointments_date_patient ON public.appointments(appointment_date, patient_id);
CREATE INDEX IF NOT EXISTS idx_queues_date_status ON public.queues(queue_date, status);
CREATE INDEX IF NOT EXISTS idx_queues_dept ON public.queues(department);
CREATE INDEX IF NOT EXISTS idx_med_delivery_date ON public.medicine_deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_med_delivery_patient ON public.medicine_deliveries(patient_id);

-- ====================================================================
-- Row Level Security (RLS) Configuration
-- ====================================================================
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_deliveries ENABLE ROW LEVEL SECURITY;

-- Doctors RLS Policies
CREATE POLICY "Allow authenticated users to read doctors" ON public.doctors 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert doctors" ON public.doctors 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update doctors" ON public.doctors 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete doctors" ON public.doctors 
    FOR DELETE TO authenticated USING (true);

-- Patients RLS Policies
CREATE POLICY "Allow authenticated users to read patients" ON public.patients 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert patients" ON public.patients 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update patients" ON public.patients 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete patients" ON public.patients 
    FOR DELETE TO authenticated USING (true);

-- Appointments RLS Policies
CREATE POLICY "Allow authenticated users to read appointments" ON public.appointments 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert appointments" ON public.appointments 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update appointments" ON public.appointments 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete appointments" ON public.appointments 
    FOR DELETE TO authenticated USING (true);

-- Queues RLS Policies
CREATE POLICY "Allow authenticated users to read queues" ON public.queues 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert queues" ON public.queues 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update queues" ON public.queues 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete queues" ON public.queues 
    FOR DELETE TO authenticated USING (true);

-- Medicine Deliveries RLS Policies
CREATE POLICY "Allow authenticated users to read medicine_deliveries" ON public.medicine_deliveries 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert medicine_deliveries" ON public.medicine_deliveries 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update medicine_deliveries" ON public.medicine_deliveries 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete medicine_deliveries" ON public.medicine_deliveries 
    FOR DELETE TO authenticated USING (true);
