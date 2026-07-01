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
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('simple', coalesce(hn, '') || ' ' || 
                              coalesce(citizen_id, '') || ' ' || 
                              coalesce(passport_number, '') || ' ' || 
                              coalesce(first_name, '') || ' ' || 
                              coalesce(last_name, '') || ' ' || 
                              coalesce(phone_number, ''))
    ) STORED,
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
    delivery_type TEXT NOT NULL DEFAULT 'pickup' CHECK (delivery_type IN ('pharmacy', 'pickup', 'post', 'rider', 'qr', 'other')),
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    prescription_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent_to_pharmacy', 'preparing', 'shipping', 'delivered', 'cancelled')),
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
CREATE INDEX IF NOT EXISTS idx_patients_search_vector_gin ON public.patients USING gin(search_vector);
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

-- ====================================================================
-- 5. User Permissions Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    display_name TEXT,
    role TEXT,
    allowed_menus TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- User Permissions RLS Policies
CREATE POLICY "Allow authenticated users to read user_permissions" ON public.user_permissions 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert user_permissions" ON public.user_permissions 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update user_permissions" ON public.user_permissions 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete user_permissions" ON public.user_permissions 
    FOR DELETE TO authenticated USING (true);


-- ====================================================================
-- 6. SYSTEM: QUESTIONNAIRES & RESPONSES
-- ====================================================================

-- 1. ตารางแบบสอบถามหลัก (Questionnaire Templates)
CREATE TABLE IF NOT EXISTS public.questionnaires (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ตารางข้อคำถาม (Questions)
CREATE TABLE IF NOT EXISTS public.question_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('text', 'number', 'radio', 'checkbox', 'scale')),
    is_required BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ตารางตัวเลือกของคำถาม (Question Options)
-- ใช้สำหรับเก็บตัวเลือกของคำถามประเภท radio, checkbox หรือ scale ที่กําหนดเอง
CREATE TABLE IF NOT EXISTS public.question_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES public.question_items(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL, -- เช่น "ดีมาก", "ใช่", "ไม่ใช่"
    option_value NUMERIC, -- คะแนนหรือค่าน้ำหนักตัวเลือก เช่น 5, 4, 3, 2, 1 (ช่วยคำนวณคะแนนประเมินได้ง่าย)
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ตารางบันทึกการทำแบบสอบถามของคนไข้ (Responses Metadata)
CREATE TABLE IF NOT EXISTS public.questionnaire_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL, -- อ้างอิงคนไข้
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL, -- อ้างอิงรอบการนัดหมาย
    total_score NUMERIC, -- คะแนนรวมที่คำนวณได้จากตัวเลือกที่ตอบ (กรณีเป็นแบบประเมินสุขภาพ)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ตารางบันทึกคำตอบหลัก (Answers)
-- รองรับการบันทึกทั้งคำตอบแบบพิมพ์ (Text) และแบบเลือกตัวเลือกเดียว (Radio/Dropdown)
CREATE TABLE IF NOT EXISTS public.questionnaire_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id UUID NOT NULL REFERENCES public.questionnaire_responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.question_items(id) ON DELETE CASCADE,
    
    -- คำตอบแบบพิมพ์ข้อความปลายเปิด (สำหรับ question_type = 'text')
    answer_text TEXT, 
    
    -- คำตอบแบบตัวเลขตรงๆ หรือคะแนนประเมิน (สำหรับ question_type = 'number' หรือ 'scale')
    answer_number NUMERIC, 
    
    -- คำตอบแบบเลือกตอบตัวเลือกเดียว (สำหรับ question_type = 'radio')
    selected_option_id UUID REFERENCES public.question_options(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(response_id, question_id) -- 1 คำถามใน 1 รอบการตอบ ต้องมีแถวคำตอบเพียงแถวเดียว
);

-- 6. ตารางบันทึกการเลือกตอบแบบหลายตัวเลือก (Answer Selections)
-- ใช้สำหรับคำถามประเภทเลือกได้หลายข้อ (Checkbox / question_type = 'checkbox')
-- เชื่อมโยงหนึ่งคำตอบ (Answer) กับหลายๆ ตัวเลือก (Options) ที่ถูกติ๊กเลือก
CREATE TABLE IF NOT EXISTS public.questionnaire_answer_selections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    answer_id UUID NOT NULL REFERENCES public.questionnaire_answers(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.question_options(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(answer_id, option_id) -- ป้องกันการบันทึกตัวเลือกเดิมซ้ำในคำตอบข้อเดียวกัน
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_answer_selections ENABLE ROW LEVEL SECURITY;

-- Questionnaires RLS Policies
CREATE POLICY "Allow authenticated users to read questionnaires" ON public.questionnaires 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert questionnaires" ON public.questionnaires 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update questionnaires" ON public.questionnaires 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete questionnaires" ON public.questionnaires 
    FOR DELETE TO authenticated USING (true);

-- Question Items RLS Policies
CREATE POLICY "Allow authenticated users to read question_items" ON public.question_items 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert question_items" ON public.question_items 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update question_items" ON public.question_items 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete question_items" ON public.question_items 
    FOR DELETE TO authenticated USING (true);

-- Question Options RLS Policies
CREATE POLICY "Allow authenticated users to read question_options" ON public.question_options 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert question_options" ON public.question_options 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update question_options" ON public.question_options 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete question_options" ON public.question_options 
    FOR DELETE TO authenticated USING (true);

-- Questionnaire Responses RLS Policies
CREATE POLICY "Allow authenticated users to read questionnaire_responses" ON public.questionnaire_responses 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert questionnaire_responses" ON public.questionnaire_responses 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update questionnaire_responses" ON public.questionnaire_responses 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete questionnaire_responses" ON public.questionnaire_responses 
    FOR DELETE TO authenticated USING (true);

-- Questionnaire Answers RLS Policies
CREATE POLICY "Allow authenticated users to read questionnaire_answers" ON public.questionnaire_answers 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert questionnaire_answers" ON public.questionnaire_answers 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update questionnaire_answers" ON public.questionnaire_answers 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete questionnaire_answers" ON public.questionnaire_answers 
    FOR DELETE TO authenticated USING (true);

-- Questionnaire Answer Selections RLS Policies
CREATE POLICY "Allow authenticated users to read questionnaire_answer_selections" ON public.questionnaire_answer_selections 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert questionnaire_answer_selections" ON public.questionnaire_answer_selections 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update questionnaire_answer_selections" ON public.questionnaire_answer_selections 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete questionnaire_answer_selections" ON public.questionnaire_answer_selections 
    FOR DELETE TO authenticated USING (true);


-- ====================================================================
-- SEED DATA: 50 QUESTIONS MOCK QUESTIONNAIRE
-- ====================================================================
DO $$
DECLARE
    q_id UUID;
    quest_id UUID := 'd3b07384-d113-43f1-a1c8-c6f3764834e5';
    i INTEGER;
BEGIN
    -- Insert questionnaire
    INSERT INTO public.questionnaires (id, title, description, status)
    VALUES (quest_id, 'แบบประเมินสุขภาพทั่วไปและพฤติกรรมสุขภาพ (50 ข้อ)', 'แบบประเมินและคัดกรองข้อมูลสุขภาพเบื้องต้นทั่วไปเพื่อใช้สนับสนุนการรักษาพยาบาลและการวินิจฉัยโรคของแพทย์', 'active')
    ON CONFLICT (id) DO NOTHING;

    -- Only insert if question items are empty for this questionnaire
    IF NOT EXISTS (SELECT 1 FROM public.question_items WHERE questionnaire_id = quest_id) THEN
        -- Q1: Text
        INSERT INTO public.question_items (id, questionnaire_id, question_text, question_type, is_required, order_index)
        VALUES ('46b283df-356c-482a-a92c-55c56d787001', quest_id, '1. ประวัติการเจ็บป่วยในอดีตหรือข้อมูลสุขภาพทั่วไปที่ต้องการแจ้งแพทย์', 'text', false, 1);

        -- Q2: Number
        INSERT INTO public.question_items (id, questionnaire_id, question_text, question_type, is_required, order_index)
        VALUES ('46b283df-356c-482a-a92c-55c56d787002', quest_id, '2. ความดันโลหิตตัวบน (Systolic BP) ล่าสุด (มม.ปรอท) - ถ้าทราบ', 'number', false, 2);

        -- Q3: Radio (Smoking status)
        q_id := '46b283df-356c-482a-a92c-55c56d787003';
        INSERT INTO public.question_items (id, questionnaire_id, question_text, question_type, is_required, order_index)
        VALUES (q_id, quest_id, '3. พฤติกรรมการสูบบุหรี่ของท่าน', 'radio', true, 3);
        INSERT INTO public.question_options (question_id, option_text, option_value, order_index) VALUES
            (q_id, 'ไม่เคยสูบเลย', 0, 1),
            (q_id, 'เคยสูบแต่ปัจจุบันเลิกแล้ว', 1, 2),
            (q_id, 'สูบเป็นครั้งคราว (ไม่ทุกวัน)', 2, 3),
            (q_id, 'สูบเป็นประจำทุกวัน', 3, 4);

        -- Q4: Radio (Alcohol)
        q_id := '46b283df-356c-482a-a92c-55c56d787004';
        INSERT INTO public.question_items (id, questionnaire_id, question_text, question_type, is_required, order_index)
        VALUES (q_id, quest_id, '4. การดื่มเครื่องดื่มที่มีแอลกอฮอล์', 'radio', true, 4);
        INSERT INTO public.question_options (question_id, option_text, option_value, order_index) VALUES
            (q_id, 'ไม่ดื่มเลย', 0, 1),
            (q_id, 'ดื่มเฉพาะโอกาสพิเศษ', 1, 2),
            (q_id, 'ดื่มเป็นประจำ (1-2 ครั้งต่อสัปดาห์)', 2, 3),
            (q_id, 'ดื่มหนักเกือบทุกวัน', 3, 4);

        -- Q5: Checkbox (Chronic diseases)
        q_id := '46b283df-356c-482a-a92c-55c56d787005';
        INSERT INTO public.question_items (id, questionnaire_id, question_text, question_type, is_required, order_index)
        VALUES (q_id, quest_id, '5. โรคประจำตัวที่ได้รับการวินิจฉัยแล้ว (เลือกได้มากกว่า 1 ข้อ)', 'checkbox', false, 5);
        INSERT INTO public.question_options (question_id, option_text, option_value, order_index) VALUES
            (q_id, 'โรคเบาหวาน (Diabetes)', 1, 1),
            (q_id, 'โรคความดันโลหิตสูง (Hypertension)', 2, 2),
            (q_id, 'โรคไขมันในเลือดสูง (Dyslipidemia)', 3, 3),
            (q_id, 'โรคหัวใจ (Heart Disease)', 4, 4),
            (q_id, 'โรคหอบหืด/ภูมิแพ้ (Asthma/Allergy)', 5, 5),
            (q_id, 'ไม่มีโรคประจำตัว', 0, 6);

        -- Q6 to Q50: Standard assessment questions
        FOR i IN 6..50 LOOP
            q_id := md5('q-item-' || i)::uuid; -- Generate stable deterministic UUID
            IF i % 4 = 0 THEN
                -- Scale questions (Rating 1-5)
                INSERT INTO public.question_items (id, questionnaire_id, question_text, question_type, is_required, order_index)
                VALUES (q_id, quest_id, i || '. ระดับความพึงพอใจต่อ' || 
                    CASE (i % 5)
                        WHEN 0 THEN 'คุณภาพการนอนหลับและการพักผ่อน'
                        WHEN 1 THEN 'สมรรถภาพทางกายในการออกกำลังกาย'
                        WHEN 2 THEN 'พฤติกรรมการเลือกรับประทานอาหารที่มีประโยชน์'
                        WHEN 3 THEN 'การจัดการอารมณ์และระดับความเครียดในชีวิตประจำวัน'
                        ELSE 'สภาพแวดล้อมและคุณภาพชีวิตโดยรวม'
                    END || ' (คะแนน 1 - น้อยที่สุด ถึง 5 - มากที่สุด)', 'scale', true, i);
                
                -- Add standard scale options 1-5
                INSERT INTO public.question_options (question_id, option_text, option_value, order_index) VALUES
                    (q_id, '1 - น้อยที่สุด / แย่มาก', 1, 1),
                    (q_id, '2 - น้อย / ค่อนข้างแย่', 2, 2),
                    (q_id, '3 - ปานกลาง', 3, 3),
                    (q_id, '4 - มาก / ดี', 4, 4),
                    (q_id, '5 - มากที่สุด / ดีเยี่ยม', 5, 5);

            ELSIF i % 4 = 1 THEN
                -- Radio questions (Frequency)
                INSERT INTO public.question_items (id, questionnaire_id, question_text, question_type, is_required, order_index)
                VALUES (q_id, quest_id, i || '. ในช่วง 1 เดือนที่ผ่านมา ท่านมีอาการ' || 
                    CASE (i % 5)
                        WHEN 0 THEN 'ปวดศีรษะหรือไมเกรนบ่อยแค่ไหน'
                        WHEN 1 THEN 'ปวดเมื่อยกล้ามเนื้อหรือปวดหลังบ่อยแค่ไหน'
                        WHEN 2 THEN 'อ่อนเพลียไม่มีแรงระหว่างวันบ่อยแค่ไหน'
                        WHEN 3 THEN 'ท้องอืด ท้องเฟ้อ หรืออาหารไม่ย่อยบ่อยแค่ไหน'
                        ELSE 'ใจสั่นหรือแน่นหน้าอกบ่อยแค่ไหน'
                    END, 'radio', true, i);

                INSERT INTO public.question_options (question_id, option_text, option_value, order_index) VALUES
                    (q_id, 'ไม่เคยมีอาการเลย', 0, 1),
                    (q_id, 'มีอาการ 1-2 ครั้งต่อเดือน', 1, 2),
                    (q_id, 'มีอาการสัปดาห์ละ 1-2 ครั้ง', 2, 3),
                    (q_id, 'มีอาการเกือบทุกวัน', 3, 4);

            ELSIF i % 4 = 2 THEN
                -- Number questions (Quantities)
                INSERT INTO public.question_items (id, questionnaire_id, question_text, question_type, is_required, order_index)
                VALUES (q_id, quest_id, i || '. ' || 
                    CASE (i % 3)
                        WHEN 0 THEN 'ปริมาณน้ำดื่มสะอาดเฉลี่ยต่อวันของท่าน (แก้ว)'
                        WHEN 1 THEN 'จำนวนชั่วโมงเฉลี่ยที่ท่านนอนหลับต่อคืน (ชั่วโมง)'
                        ELSE 'จำนวนวันเฉลี่ยที่ท่านออกกำลังกายต่อสัปดาห์ (วัน)'
                    END, 'number', false, i);

            ELSE
                -- Text questions
                INSERT INTO public.question_items (id, questionnaire_id, question_text, question_type, is_required, order_index)
                VALUES (q_id, quest_id, i || '. ' || 
                    CASE (i % 3)
                        WHEN 0 THEN 'โปรดระบุเป้าหมายการดูแลสุขภาพของท่านในระยะสั้น (เช่น การลดน้ำหนัก, การควบคุมน้ำตาล)'
                        WHEN 1 THEN 'โปรดระบุข้อจำกัดในการออกกำลังกายหรือการทำกิจกรรมทางกายของท่าน (ถ้ามี)'
                        ELSE 'โปรดระบุอาการผิดปกติหรือข้อกังวลเกี่ยวกับสุขภาพในปัจจุบันที่ต้องการแจ้งแพทย์เป็นพิเศษ'
                    END, 'text', false, i);
            END IF;
        END LOOP;
    END IF;
END $$;


-- ====================================================================
-- SEED DATA: MOCK PATIENT AND 50 ANSWERED QUESTIONS RESPONSE
-- ====================================================================
-- 1. Insert Mock Patient
INSERT INTO public.patients (
    id, hn, title, first_name, last_name, gender, date_of_birth, 
    phone_number, address, emergency_contact_name, emergency_contact_phone, 
    medical_right, primary_doctor, allergy_note, chronic_disease_note, status
) VALUES (
    'f5f5f5f5-f5f5-f5f5-f5f5-f5f5f5f5f5f5', 
    'HN-MOCK50', 
    'นาย', 
    'สมชาย', 
    'รักสุขภาพ', 
    'ชาย', 
    '1985-05-15', 
    '0898765432', 
    '99/9 หมู่ 5 ต.บางเขน อ.เมือง จ.นนทบุรี', 
    'นางสมศรี รักสุขภาพ', 
    '0891234567', 
    'สิทธิประกันสังคม', 
    'นพ.สมศักดิ์ รักษาดี', 
    'แพ้ยาเพนิซิลลิน', 
    'ความดันโลหิตสูง', 
    'active'
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert Response Metadata
INSERT INTO public.questionnaire_responses (
    id, questionnaire_id, patient_id, total_score, notes
) VALUES (
    'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0', 
    'd3b07384-d113-43f1-a1c8-c6f3764834e5', 
    'f5f5f5f5-f5f5-f5f5-f5f5-f5f5f5f5f5f5', 
    115, 
    'ข้อมูลผลการประเมินประวัติสุขภาพจำลอง 50 ข้อเพื่อการทดสอบระบบ'
) ON CONFLICT (id) DO NOTHING;

-- 3. Insert Answers for all 50 questions
DO $$
DECLARE
    q_rec RECORD;
    resp_id UUID := 'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0';
    ans_id UUID;
    opt_rec RECORD;
BEGIN
    -- Only seed if the response exists and has no answers yet
    IF EXISTS (SELECT 1 FROM public.questionnaire_responses WHERE id = resp_id) AND 
       NOT EXISTS (SELECT 1 FROM public.questionnaire_answers WHERE response_id = resp_id) THEN
         
        FOR q_rec IN (
            SELECT id, question_type, order_index 
            FROM public.question_items 
            WHERE questionnaire_id = 'd3b07384-d113-43f1-a1c8-c6f3764834e5'
            ORDER BY order_index
        ) LOOP
              
            IF q_rec.question_type = 'text' THEN
                INSERT INTO public.questionnaire_answers (response_id, question_id, answer_text)
                VALUES (resp_id, q_rec.id, 'ข้อมูลการประเมินเบื้องต้น: สุขภาพแข็งแรงดี ไม่มีภาวะเสี่ยงวิกฤต');
                  
            ELSIF q_rec.question_type = 'number' THEN
                INSERT INTO public.questionnaire_answers (response_id, question_id, answer_number)
                VALUES (resp_id, q_rec.id, 
                    CASE 
                        WHEN q_rec.order_index = 2 THEN 125 -- Systolic BP
                        WHEN q_rec.order_index % 3 = 0 THEN 8 -- Sleep hours
                        WHEN q_rec.order_index % 3 = 1 THEN 3 -- Exercise days
                        ELSE 6 -- Water cups
                    END
                );
                  
            ELSIF q_rec.question_type = 'radio' THEN
                -- Pick option at index 2 (or 1st index if not exists)
                SELECT id, option_value INTO opt_rec 
                FROM public.question_options 
                WHERE question_id = q_rec.id 
                ORDER BY order_index 
                LIMIT 1 OFFSET CASE WHEN q_rec.order_index % 2 = 0 THEN 1 ELSE 0 END;
                
                IF NOT FOUND THEN
                    SELECT id, option_value INTO opt_rec FROM public.question_options WHERE question_id = q_rec.id ORDER BY order_index LIMIT 1;
                END IF;

                INSERT INTO public.questionnaire_answers (response_id, question_id, selected_option_id, answer_number)
                VALUES (resp_id, q_rec.id, opt_rec.id, opt_rec.option_value);
                  
            ELSIF q_rec.question_type = 'checkbox' THEN
                -- Select first option for checkbox
                SELECT id INTO opt_rec FROM public.question_options WHERE question_id = q_rec.id ORDER BY order_index LIMIT 1;
                
                INSERT INTO public.questionnaire_answers (id, response_id, question_id)
                VALUES (gen_random_uuid(), resp_id, q_rec.id)
                RETURNING id INTO ans_id;
                
                INSERT INTO public.questionnaire_answer_selections (answer_id, option_id)
                VALUES (ans_id, opt_rec.id);
                  
            ELSIF q_rec.question_type = 'scale' THEN
                -- Pick scale option (e.g., value 4)
                SELECT id, option_value INTO opt_rec 
                FROM public.question_options 
                WHERE question_id = q_rec.id AND order_index = 4;
                
                IF NOT FOUND THEN
                    SELECT id, option_value INTO opt_rec FROM public.question_options WHERE question_id = q_rec.id ORDER BY order_index LIMIT 1;
                END IF;

                INSERT INTO public.questionnaire_answers (response_id, question_id, selected_option_id, answer_number)
                VALUES (resp_id, q_rec.id, opt_rec.id, opt_rec.option_value);
                  
            END IF;
              
        END LOOP;
    END IF;
END $$;


-- ====================================================================
-- 7. PATIENT DISEASES & LAB RESULTS
-- ====================================================================

-- 1. Patient Diseases Table
CREATE TABLE IF NOT EXISTS public.patient_diseases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    disease_name TEXT NOT NULL,
    disease_code TEXT, -- ICD-10 Code
    diagnosed_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Patient Lab Results Table
CREATE TABLE IF NOT EXISTS public.patient_lab_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    test_date DATE NOT NULL DEFAULT CURRENT_DATE,
    result_value TEXT NOT NULL,
    unit TEXT,
    reference_range TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patient_diseases_patient ON public.patient_diseases(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_lab_results_patient ON public.patient_lab_results(patient_id);

-- Enable RLS
ALTER TABLE public.patient_diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_lab_results ENABLE ROW LEVEL SECURITY;

-- Policies for patient_diseases
CREATE POLICY "Allow authenticated users to read patient_diseases" ON public.patient_diseases 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert patient_diseases" ON public.patient_diseases 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update patient_diseases" ON public.patient_diseases 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete patient_diseases" ON public.patient_diseases 
    FOR DELETE TO authenticated USING (true);

-- Policies for patient_lab_results
CREATE POLICY "Allow authenticated users to read patient_lab_results" ON public.patient_lab_results 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert patient_lab_results" ON public.patient_lab_results 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update patient_lab_results" ON public.patient_lab_results 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete patient_lab_results" ON public.patient_lab_results 
    FOR DELETE TO authenticated USING (true);


-- ====================================================================
-- SEED DATA: DEFAULT ADMIN PERMISSIONS
-- ====================================================================
INSERT INTO public.user_permissions (
    user_id,
    display_name,
    role,
    allowed_menus
) VALUES (
    'admin@opd.com',
    'ผู้ดูแลระบบ (Admin)',
    'admin',
    ARRAY['overview', 'patients', 'appointments', 'queues', 'deliveries', 'questionnaire', 'doctors', 'permissions', 'import-lab']
) ON CONFLICT (user_id) DO NOTHING;


-- ====================================================================
-- 8. DISEASES CATALOG
-- ====================================================================

-- Diseases Table
CREATE TABLE IF NOT EXISTS public.diseases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL, -- e.g., 'DM', 'HT', 'DLP', 'CKD'
    nameen TEXT NOT NULL,
    nameth TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;

-- Policies for diseases
CREATE POLICY "Allow authenticated users to read diseases" ON public.diseases 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert diseases" ON public.diseases 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update diseases" ON public.diseases 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete diseases" ON public.diseases 
    FOR DELETE TO authenticated USING (true);

-- Seed initial required diseases: DM, HT, DLP, CKD
INSERT INTO public.diseases (code, nameen, nameth, description) VALUES
('DM', 'Diabetes Mellitus', 'โรคเบาหวาน', 'โรคเบาหวาน (Diabetes Mellitus) เป็นภาวะที่ร่างกายมีระดับน้ำตาลในเลือดสูงกว่าปกติ'),
('HT', 'Hypertension', 'โรคความดันโลหิตสูง', 'โรคความดันโลหิตสูง (Hypertension) เป็นภาวะที่มีแรงดันของกระแสเลือดแรงกว่าปกติค้างเป็นเวลานาน'),
('DLP', 'Dyslipidemia', 'โรคไขมันในเลือดสูง', 'โรคไขมันในเลือดสูง (Dyslipidemia) เป็นภาวะที่ร่างกายมีระดับไขมันในเลือดผิดปกติ'),
('CKD', 'Chronic Kidney Disease', 'โรคไตเรื้อรัง', 'โรคไตเรื้อรัง (Chronic Kidney Disease) เป็นภาวะที่ไตทำงานผิดปกติเป็นระยะเวลานาน')
ON CONFLICT (code) DO NOTHING;


-- ====================================================================
-- 9. PATIENT FOOT ASSESSMENTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.patient_foot_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
    result_status TEXT NOT NULL CHECK (result_status IN ('ปกติ', 'ผิดปกติ')),
    notes TEXT, -- Stores JSON structure: { ltResult, rtResult, wagnerGrade, pulseLt, pulseRt, remarks }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.patient_foot_assessments ENABLE ROW LEVEL SECURITY;

-- Policies for patient_foot_assessments
CREATE POLICY "Allow authenticated users to read patient_foot_assessments" ON public.patient_foot_assessments 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert patient_foot_assessments" ON public.patient_foot_assessments 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update patient_foot_assessments" ON public.patient_foot_assessments 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete patient_foot_assessments" ON public.patient_foot_assessments 
    FOR DELETE TO authenticated USING (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_patient_foot_assess_patient ON public.patient_foot_assessments(patient_id);


-- ====================================================================
-- 10. PATIENT ABI ASSESSMENTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.patient_abi_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
    result_status TEXT NOT NULL CHECK (result_status IN ('ปกติ', 'ผิดปกติ')),
    notes TEXT, -- Stores JSON structure: { ltResult: { status: 'normal'|'abnormal', value: string }, rtResult: { status: 'normal'|'abnormal', value: string }, remarks: string }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.patient_abi_assessments ENABLE ROW LEVEL SECURITY;

-- Policies for patient_abi_assessments
CREATE POLICY "Allow authenticated users to read patient_abi_assessments" ON public.patient_abi_assessments 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert patient_abi_assessments" ON public.patient_abi_assessments 
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update patient_abi_assessments" ON public.patient_abi_assessments 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete patient_abi_assessments" ON public.patient_abi_assessments 
    FOR DELETE TO authenticated USING (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_patient_abi_assess_patient ON public.patient_abi_assessments(patient_id);

