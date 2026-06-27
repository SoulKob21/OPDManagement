import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import type { Patient } from '../types/opd';

interface Questionnaire {
  id: string;
  title: string;
  description: string | null;
  status: 'active' | 'inactive';
}

interface QuestionItem {
  id: string;
  questionnaire_id: string;
  question_text: string;
  question_type: 'text' | 'number' | 'radio' | 'checkbox' | 'scale';
  is_required: boolean;
  order_index: number;
}

interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  option_value: number | null;
  order_index: number;
}

interface AnswerState {
  question_id: string;
  answer_text?: string;
  answer_number?: number;
  selected_option_id?: string;
  checkbox_selections?: string[]; // array of option_id
  option_value?: number; // numeric value/score of option
}

// 1. Static Mock Patients
const MOCK_PATIENTS: Patient[] = [
  {
    id: 'mock-p1',
    hn: 'HN-0001',
    title: 'นาย',
    first_name: 'ปรีชา',
    last_name: 'ใจดี',
    gender: 'ชาย',
    date_of_birth: '1981-06-15',
    phone_number: '0812345678',
    address: '123/45 ถนนพหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพฯ',
    emergency_contact_name: 'สมจิต ใจดี',
    emergency_contact_phone: '0812345679',
    medical_right: 'สิทธิข้าราชการ/รัฐวิสาหกิจ',
    primary_doctor: 'นพ.สมศักดิ์ รักษาดี',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-p2',
    hn: 'HN-0002',
    title: 'นางสาว',
    first_name: 'นิภา',
    last_name: 'รักษ์ดี',
    gender: 'หญิง',
    date_of_birth: '1994-09-20',
    phone_number: '0898765432',
    address: '456/78 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ',
    emergency_contact_name: 'สมชัย รักษ์ดี',
    emergency_contact_phone: '0898765431',
    medical_right: 'สิทธิประกันสังคม',
    primary_doctor: 'พญ.สมหญิง ใจดี',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-p3',
    hn: 'HN-0003',
    title: 'เด็กชาย',
    first_name: 'ธนา',
    last_name: 'สุขสมบูรณ์',
    gender: 'ชาย',
    date_of_birth: '2016-03-10',
    phone_number: '0851112222',
    address: '789 ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ',
    emergency_contact_name: 'สมศรี สุขสมบูรณ์',
    emergency_contact_phone: '0851112221',
    medical_right: 'บัตรทอง (หลักประกันสุขภาพถ้วนหน้า)',
    primary_doctor: 'พญ.สมหญิง ใจดี',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-p4',
    hn: 'HN-MOCK50',
    title: 'นาย',
    first_name: 'สมชาย',
    last_name: 'รักสุขภาพ',
    gender: 'ชาย',
    date_of_birth: '1985-05-15',
    phone_number: '0898765432',
    address: '99/9 หมู่ 5 ต.บางเขน อ.เมือง จ.นนทบุรี',
    emergency_contact_name: 'สมพิศ รักสุขภาพ',
    emergency_contact_phone: '0898765431',
    medical_right: 'สิทธิประกันสังคม',
    primary_doctor: 'นพ.สมศักดิ์ รักษาดี',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// 2. Statically Generate 50 mock questions
const generateMockQuestions = (): { questions: QuestionItem[], options: Record<string, QuestionOption[]> } => {
  const questions: QuestionItem[] = [];
  const options: Record<string, QuestionOption[]> = {};

  // Q1
  questions.push({
    id: 'q1',
    questionnaire_id: 'mock-q-id',
    question_text: '1. ประวัติการเจ็บป่วยในอดีตหรือข้อมูลสุขภาพทั่วไปที่ต้องการแจ้งแพทย์',
    question_type: 'text',
    is_required: true,
    order_index: 1
  });

  // Q2
  questions.push({
    id: 'q2',
    questionnaire_id: 'mock-q-id',
    question_text: '2. ความดันโลหิตตัวบน (Systolic BP) ล่าสุด (มม.ปรอท) - ถ้าทราบ',
    question_type: 'number',
    is_required: true,
    order_index: 2
  });

  // Q3
  questions.push({
    id: 'q3',
    questionnaire_id: 'mock-q-id',
    question_text: '3. พฤติกรรมการสูบบุหรี่ของท่าน',
    question_type: 'radio',
    is_required: true,
    order_index: 3
  });
  options['q3'] = [
    { id: 'q3-o1', question_id: 'q3', option_text: 'ไม่เคยสูบเลย', option_value: 0, order_index: 1 },
    { id: 'q3-o2', question_id: 'q3', option_text: 'เคยสูบแต่ปัจจุบันเลิกแล้ว', option_value: 1, order_index: 2 },
    { id: 'q3-o3', question_id: 'q3', option_text: 'สูบเป็นครั้งคราว (ไม่ทุกวัน)', option_value: 2, order_index: 3 },
    { id: 'q3-o4', question_id: 'q3', option_text: 'สูบเป็นประจำทุกวัน', option_value: 3, order_index: 4 }
  ];

  // Q4
  questions.push({
    id: 'q4',
    questionnaire_id: 'mock-q-id',
    question_text: '4. การดื่มเครื่องดื่มที่มีแอลกอฮอล์',
    question_type: 'radio',
    is_required: true,
    order_index: 4
  });
  options['q4'] = [
    { id: 'q4-o1', question_id: 'q4', option_text: 'ไม่ดื่มเลย', option_value: 0, order_index: 1 },
    { id: 'q4-o2', question_id: 'q4', option_text: 'ดื่มเฉพาะโอกาสพิเศษ', option_value: 1, order_index: 2 },
    { id: 'q4-o3', question_id: 'q4', option_text: 'ดื่มเป็นประจำ (1-2 ครั้งต่อสัปดาห์)', option_value: 2, order_index: 3 },
    { id: 'q4-o4', question_id: 'q4', option_text: 'ดื่มหนักเกือบทุกวัน', option_value: 3, order_index: 4 }
  ];

  // Q5
  questions.push({
    id: 'q5',
    questionnaire_id: 'mock-q-id',
    question_text: '5. โรคประจำตัวที่ได้รับการวินิจฉัยแล้ว (เลือกได้มากกว่า 1 ข้อ)',
    question_type: 'checkbox',
    is_required: true,
    order_index: 5
  });
  options['q5'] = [
    { id: 'q5-o1', question_id: 'q5', option_text: 'โรคเบาหวาน (Diabetes)', option_value: 1, order_index: 1 },
    { id: 'q5-o2', question_id: 'q5', option_text: 'โรคความดันโลหิตสูง (Hypertension)', option_value: 2, order_index: 2 },
    { id: 'q5-o3', question_id: 'q5', option_text: 'โรคไขมันในเลือดสูง (Dyslipidemia)', option_value: 3, order_index: 3 },
    { id: 'q5-o4', question_id: 'q5', option_text: 'โรคหัวใจ (Heart Disease)', option_value: 4, order_index: 4 },
    { id: 'q5-o5', question_id: 'q5', option_text: 'โรคหอบหืด/ภูมิแพ้ (Asthma/Allergy)', option_value: 5, order_index: 5 },
    { id: 'q5-o6', question_id: 'q5', option_text: 'ไม่มีโรคประจำตัว', option_value: 0, order_index: 6 }
  ];

  // Q6 to Q50
  for (let i = 6; i <= 50; i++) {
    const qId = `q${i}`;
    if (i % 4 === 0) {
      // Scale
      const scaleTopics = [
        'คุณภาพการนอนหลับและการพักผ่อน',
        'สมรรถภาพทางกายในการออกกำลังกาย',
        'พฤติกรรมการเลือกรับประทานอาหารที่มีประโยชน์',
        'การจัดการอารมณ์และระดับความเครียดในชีวิตประจำวัน',
        'สภาพแวดล้อมและคุณภาพชีวิตโดยรวม'
      ];
      const topic = scaleTopics[i % 5];
      questions.push({
        id: qId,
        questionnaire_id: 'mock-q-id',
        question_text: `${i}. ระดับความพึงพอใจต่อ${topic} (คะแนน 1 - น้อยที่สุด ถึง 5 - มากที่สุด)`,
        question_type: 'scale',
        is_required: true,
        order_index: i
      });
      options[qId] = [
        { id: `${qId}-o1`, question_id: qId, option_text: '1 - น้อยที่สุด / แย่มาก', option_value: 1, order_index: 1 },
        { id: `${qId}-o2`, question_id: qId, option_text: '2 - น้อย / ค่อนข้างแย่', option_value: 2, order_index: 2 },
        { id: `${qId}-o3`, question_id: qId, option_text: '3 - ปานกลาง', option_value: 3, order_index: 3 },
        { id: `${qId}-o4`, question_id: qId, option_text: '4 - มาก / ดี', option_value: 4, order_index: 4 },
        { id: `${qId}-o5`, question_id: qId, option_text: '5 - มากที่สุด / ดีเยี่ยม', option_value: 5, order_index: 5 }
      ];
    } else if (i % 4 === 1) {
      // Radio
      const radioTopics = [
        'ปวดศีรษะหรือไมเกรนบ่อยแค่ไหน',
        'ปวดเมื่อยกล้ามเนื้อหรือปวดหลังบ่อยแค่ไหน',
        'อ่อนเพลียไม่มีแรงระหว่างวันบ่อยแค่ไหน',
        'ท้องอืด ท้องเฟ้อ หรืออาหารไม่ย่อยบ่อยแค่ไหน',
        'ใจสั่นหรือแน่นหน้าอกบ่อยแค่ไหน'
      ];
      const topic = radioTopics[i % 5];
      questions.push({
        id: qId,
        questionnaire_id: 'mock-q-id',
        question_text: `${i}. ในช่วง 1 เดือนที่ผ่านมา ท่านมีอาการ${topic}`,
        question_type: 'radio',
        is_required: true,
        order_index: i
      });
      options[qId] = [
        { id: `${qId}-o1`, question_id: qId, option_text: 'ไม่เคยมีอาการเลย', option_value: 0, order_index: 1 },
        { id: `${qId}-o2`, question_id: qId, option_text: 'มีอาการ 1-2 ครั้งต่อเดือน', option_value: 1, order_index: 2 },
        { id: `${qId}-o3`, question_id: qId, option_text: 'มีอาการสัปดาห์ละ 1-2 ครั้ง', option_value: 2, order_index: 3 },
        { id: `${qId}-o4`, question_id: qId, option_text: 'มีอาการเกือบทุกวัน', option_value: 3, order_index: 4 }
      ];
    } else if (i % 4 === 2) {
      // Number
      const numberTopics = [
        'ปริมาณน้ำดื่มสะอาดเฉลี่ยต่อวันของท่าน (แก้ว)',
        'จำนวนชั่วโมงเฉลี่ยที่ท่านนอนหลับต่อคืน (ชั่วโมง)',
        'จำนวนวันเฉลี่ยที่ท่านออกกำลังกายต่อสัปดาห์ (วัน)'
      ];
      const topic = numberTopics[i % 3];
      questions.push({
        id: qId,
        questionnaire_id: 'mock-q-id',
        question_text: `${i}. ${topic}`,
        question_type: 'number',
        is_required: true,
        order_index: i
      });
    } else {
      // Text
      const textTopics = [
        'โปรดระบุเป้าหมายการดูแลสุขภาพของท่านในระยะสั้น (เช่น การลดน้ำหนัก, การควบคุมน้ำตาล)',
        'โปรดระบุข้อจำกัดในการออกกำลังกายหรือการทำกิจกรรมทางกายของท่าน (ถ้ามี)',
        'โปรดระบุอาการผิดปกติหรือข้อกังวลเกี่ยวกับสุขภาพในปัจจุบันที่ต้องการแจ้งแพทย์เป็นพิเศษ'
      ];
      const topic = textTopics[i % 3];
      questions.push({
        id: qId,
        questionnaire_id: 'mock-q-id',
        question_text: `${i}. ${topic}`,
        question_type: 'text',
        is_required: true,
        order_index: i
      });
    }
  }

  return { questions, options };
};

export const QuestionnairePage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Patient States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchingPatients, setSearchingPatients] = useState<boolean>(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Questionnaire States
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [options, setOptions] = useState<Record<string, QuestionOption[]>>({});
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});

  // Active question highlighting (sidebar and intersection)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Validation State
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  // Refs for sidebar scroll synchronization
  const sidebarContainerRef = useRef<HTMLDivElement | null>(null);
  const sidebarButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Fetch initial list of patients for selection
  useEffect(() => {
    fetchPatients();
  }, []);

  // Load questionnaire once patient is selected
  useEffect(() => {
    if (selectedPatient) {
      loadActiveQuestionnaire();
    } else {
      setQuestionnaire(null);
      setQuestions([]);
      setOptions({});
      setAnswers({});
    }
  }, [selectedPatient]);

  const fetchPatients = async (queryVal: string = '') => {
    setSearchingPatients(true);
    setError(null);
    
    // Simulate network query over static mock patients list
    setTimeout(() => {
      if (queryVal.trim()) {
        const cleanQuery = queryVal.trim().toLowerCase();
        const filtered = MOCK_PATIENTS.filter(p => 
          p.hn.toLowerCase().includes(cleanQuery) ||
          p.first_name.toLowerCase().includes(cleanQuery) ||
          p.last_name.toLowerCase().includes(cleanQuery)
        );
        setPatients(filtered);
      } else {
        setPatients(MOCK_PATIENTS);
      }
      setSearchingPatients(false);
    }, 250);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(searchQuery);
  };

  const loadActiveQuestionnaire = async () => {
    setLoading(true);
    setError(null);

    // Simulate network load of questions
    setTimeout(() => {
      setQuestionnaire({
        id: 'mock-q-id',
        title: 'แบบประเมินสุขภาพทั่วไปและพฤติกรรมสุขภาพ (50 ข้อ) [ระบบทดสอบออฟไลน์]',
        description: 'ระบบแบบสอบถามแบบแยกตัวทำงานอิสระออฟไลน์ เพื่อทดสอบส่วนติดต่อผู้ใช้ (UI) และระบบนำทาง Sidebar ควิกคลิกแบบไม่มีรบกวน',
        status: 'active'
      });

      const { questions: mockQ, options: mockO } = generateMockQuestions();
      setQuestions(mockQ);
      setOptions(mockO);
      setValidationErrors({});

      // Initialize empty answers state
      const initialAnswers: Record<string, AnswerState> = {};
      mockQ.forEach(q => {
        initialAnswers[q.id] = {
          question_id: q.id,
          checkbox_selections: []
        };
      });
      setAnswers(initialAnswers);
      setLoading(false);
    }, 250);
  };

  // Keyboard navigation up and down arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') {
        return;
      }

      if (questions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(activeQuestionIndex + 1, questions.length - 1);
        scrollToQuestion(nextIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(activeQuestionIndex - 1, 0);
        scrollToQuestion(prevIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuestionIndex, questions]);

  // Setup IntersectionObserver to update activeQuestionIndex on scroll
  useEffect(() => {
    if (questions.length === 0) return;

    const observerOptions = {
      root: null, // screen viewport
      rootMargin: '-25% 0px -55% 0px', // watch middle-upper area of screen
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          const match = id.match(/question-num-(\d+)/);
          if (match) {
            const index = parseInt(match[1], 10) - 1;
            setActiveQuestionIndex(index);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    questions.forEach((_, idx) => {
      const el = document.getElementById(`question-num-${idx + 1}`);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [questions]);

  // Auto-scroll the sidebar container so that the active question button is always visible
  useEffect(() => {
    const activeBtn = sidebarButtonsRef.current[activeQuestionIndex];
    const container = sidebarContainerRef.current;
    
    if (activeBtn && container) {
      const btnTop = activeBtn.offsetTop;
      const btnHeight = activeBtn.offsetHeight;
      const containerHeight = container.offsetHeight;
      const containerScrollTop = container.scrollTop;

      if (btnTop < containerScrollTop) {
        container.scrollTo({ top: btnTop - 8, behavior: 'smooth' });
      } else if (btnTop + btnHeight > containerScrollTop + containerHeight) {
        container.scrollTo({ top: btnTop + btnHeight - containerHeight + 8, behavior: 'smooth' });
      }
    }
  }, [activeQuestionIndex]);

  const scrollToQuestion = (index: number) => {
    setActiveQuestionIndex(index);
    const element = document.getElementById(`question-num-${index + 1}`);
    if (element) {
      // Find the y position taking into account sticky patient bar offset (~80px = ~90px offset)
      const yOffset = -90; 
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const checkAnswerAndClearError = (questionId: string, isAnswered: boolean) => {
    setValidationErrors(prev => {
      const hasErrorsActive = Object.keys(prev).length > 0;
      if (!hasErrorsActive) return prev;

      if (isAnswered) {
        if (prev[questionId]) {
          const next = { ...prev };
          delete next[questionId];
          return next;
        }
      } else {
        const question = questions.find(q => q.id === questionId);
        if (question && question.is_required) {
          return { ...prev, [questionId]: true };
        }
      }
      return prev;
    });
  };

  // State update handlers
  const updateAnswerText = (questionId: string, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answer_text: text
      }
    }));
    checkAnswerAndClearError(questionId, text.trim().length > 0);
  };

  const updateAnswerNumber = (questionId: string, numStr: string) => {
    const num = numStr === '' ? undefined : Number(numStr);
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answer_number: num
      }
    }));
    checkAnswerAndClearError(questionId, numStr !== '');
  };

  const updateAnswerRadio = (questionId: string, optionId: string, val: number | null) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selected_option_id: optionId,
        option_value: val !== null ? val : undefined
      }
    }));
    checkAnswerAndClearError(questionId, true);
  };

  const updateAnswerCheckbox = (questionId: string, optionId: string, checked: boolean) => {
    setAnswers(prev => {
      const currentSelections = prev[questionId]?.checkbox_selections || [];
      const nextSelections = checked
        ? [...currentSelections, optionId]
        : currentSelections.filter(id => id !== optionId);

      setTimeout(() => {
        checkAnswerAndClearError(questionId, nextSelections.length > 0);
      }, 0);

      return {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          checkbox_selections: nextSelections
        }
      };
    });
  };

  const isQuestionAnswered = (qId: string, qType: string): boolean => {
    const ans = answers[qId];
    if (!ans) return false;

    if (qType === 'checkbox') {
      return !!(ans.checkbox_selections && ans.checkbox_selections.length > 0);
    }
    if (qType === 'text') {
      return !!(ans.answer_text && ans.answer_text.trim().length > 0);
    }
    if (qType === 'number') {
      return ans.answer_number !== undefined && ans.answer_number !== null && !isNaN(ans.answer_number);
    }
    if (qType === 'radio' || qType === 'scale') {
      return !!(ans.selected_option_id);
    }
    return false;
  };

  const getAnsweredCount = (): number => {
    return questions.filter(q => isQuestionAnswered(q.id, q.question_type)).length;
  };

  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? age : 0;
  };

  // Submit response (Offline Simulator)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !questionnaire) return;

    // Check required fields
    const unansweredRequired = questions.filter(q => q.is_required && !isQuestionAnswered(q.id, q.question_type));
    if (unansweredRequired.length > 0) {
      // Create validation error map
      const errs: Record<string, boolean> = {};
      unansweredRequired.forEach(q => {
        errs[q.id] = true;
      });
      setValidationErrors(errs);

      const indexes = unansweredRequired.map(q => questions.indexOf(q) + 1).join(', ');
      setError(`กรุณาตอบคำถามที่จำเป็นให้ครบถ้วน (ข้อที่: ${indexes})`);
      
      // Scroll to the first unanswered required question
      const firstIdx = questions.indexOf(unansweredRequired[0]);
      scrollToQuestion(firstIdx);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      // Simulate network save
      setTimeout(() => {
        let totalScore = 0;
        let hasScores = false;
        
        questions.forEach(q => {
          const ans = answers[q.id];
          if (ans && ans.option_value !== undefined) {
            totalScore += ans.option_value;
            hasScores = true;
          }
        });

        // Log results to console
        console.log('=== [OFFLINE SUBMIT SUCCESS] ===');
        console.log('Patient details:', selectedPatient);
        console.log('Questionnaire:', questionnaire.title);
        console.log('Total score calculated:', hasScores ? totalScore : 'None');
        console.log('Response state payload:', answers);
        console.log('=================================');

        setSuccess(`บันทึกแบบสอบถามแบบออฟไลน์สำเร็จ! รวมคะแนนดิบ: ${hasScores ? totalScore : '-'} (ข้อมูลจำลองรายละเอียดถูกพิมพ์ออกทาง Browser Dev Console แล้ว)`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setSelectedPatient(null);
        setIsSubmitting(false);

        // Hide success banner
        setTimeout(() => setSuccess(null), 6000);
      }, 750);
      
    } catch (err: any) {
      console.error('Error saving questionnaire response:', err);
      setError('ไม่สามารถบันทึกแบบสอบถามได้');
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('คุณต้องการล้างคำตอบทั้งหมดใช่หรือไม่?')) {
      const resetAnswers: Record<string, AnswerState> = {};
      questions.forEach(q => {
        resetAnswers[q.id] = {
          question_id: q.id,
          checkbox_selections: []
        };
      });
      setAnswers(resetAnswers);
      setValidationErrors({});
      scrollToQuestion(0);
    }
  };

  const handleFillMock = () => {
    if (questions.length === 0) return;
    
    const mockAnswers: Record<string, AnswerState> = {};
    
    questions.forEach((q) => {
      const qOpts = options[q.id] || [];
      const order = q.order_index;
      
      if (q.question_type === 'text') {
        mockAnswers[q.id] = {
          question_id: q.id,
          answer_text: `คำตอบทดสอบสำหรับคำถามข้อที่ ${order}: ผลการประเมินเบื้องต้นอยู่ในเกณฑ์ปกติ ไม่มีประวัติเจ็บป่วยร้ายแรง`
        };
      } else if (q.question_type === 'number') {
        mockAnswers[q.id] = {
          question_id: q.id,
          answer_number: order === 2 ? 120 : (order % 3 === 0 ? 8 : (order % 3 === 1 ? 3 : 6))
        };
      } else if (q.question_type === 'radio') {
        const opt = qOpts[order % qOpts.length];
        mockAnswers[q.id] = {
          question_id: q.id,
          selected_option_id: opt.id,
          option_value: opt.option_value !== null ? opt.option_value : undefined
        };
      } else if (q.question_type === 'checkbox') {
        const opt = qOpts[0];
        mockAnswers[q.id] = {
          question_id: q.id,
          checkbox_selections: opt ? [opt.id] : []
        };
      } else if (q.question_type === 'scale') {
        const opt = qOpts[Math.min(3, qOpts.length - 1)];
        mockAnswers[q.id] = {
          question_id: q.id,
          selected_option_id: opt.id,
          option_value: opt.option_value !== null ? opt.option_value : undefined
        };
      }
    });
    
    setAnswers(mockAnswers);
    setValidationErrors({});
    setSuccess('กรอกข้อมูลทดสอบจำลองทั้ง 50 ข้อ เรียบร้อยแล้ว! ท่านสามารถตรวจสอบคำตอบและกดส่งข้อมูลได้ทันที');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setSuccess(null), 5000);
  };

  return (
    <DashboardLayout activeMenu="questionnaire" title="แบบสอบถามและประเมินสุขภาพ">
      {/* Dynamic Styling */}
      <style>{`
        .tail-layout {
          overflow: visible !important;
        }
        .tail-main-area {
          overflow: visible !important;
        }
        .tail-header {
          display: none !important;
        }
        .sticky-patient-bar {
          position: sticky;
          top: 0px;
          z-index: 850;
          background-color: var(--bg-surface-solid);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-md);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          backdrop-filter: blur(8px);
        }
        .patient-info-text {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .patient-info-badge {
          background-color: var(--primary-subtle);
          color: var(--primary);
          padding: 0.25rem 0.625rem;
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
        }
        .sticky-bar-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .sticky-bar-progress {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .questionnaire-layout {
          display: flex;
          gap: 2rem;
          position: relative;
        }
        .questionnaire-main-content {
          flex-grow: 1;
          max-width: calc(100% - 70px);
        }
        .question-card {
          background-color: var(--bg-surface-solid);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.75rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-sm);
          transition: all 0.2s ease;
        }
        .question-card.active {
          border-color: var(--primary);
          box-shadow: var(--shadow-md), 0 0 0 3px var(--primary-glow);
        }
        .question-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 1rem;
          display: flex;
          align-items: flex-start;
          gap: 0.25rem;
        }
        .required-star {
          color: var(--danger);
          font-weight: bold;
          margin-left: 0.125rem;
        }
        .options-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }
        @media (min-width: 640px) {
          .options-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .option-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border: 1.5px solid var(--border-color);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.15s ease;
          user-select: none;
        }
        .option-label:hover {
          border-color: var(--primary);
          background-color: var(--primary-subtle);
        }
        .option-label.checked {
          border-color: var(--primary);
          background-color: var(--primary-subtle);
          color: var(--primary-hover);
          font-weight: 600;
        }
        .scale-options-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .scale-option-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.25rem;
          border: 1.5px solid var(--border-color);
          border-radius: var(--radius-md);
          background-color: var(--bg-surface-solid);
          color: var(--text-primary);
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }
        .scale-option-btn:hover {
          border-color: var(--primary);
          background-color: var(--primary-subtle);
        }
        .scale-option-btn.checked {
          border-color: var(--primary);
          background-color: var(--primary-subtle);
          color: var(--primary);
          font-weight: 600;
        }
        .scale-badge {
          background-color: var(--primary);
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
        }
        /* Right sidebar nav floating style */
        .question-sidebar-nav {
          position: fixed;
          right: 1.5rem;
          top: 55%;
          transform: translateY(-50%);
          background-color: var(--bg-surface-solid);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 0.75rem 0.5rem;
          box-shadow: var(--shadow-lg);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .question-sidebar-title {
          font-size: 0.625rem;
          font-weight: 800;
          color: var(--text-secondary);
          text-transform: uppercase;
          margin-bottom: 0.25rem;
          letter-spacing: 0.5px;
          writing-mode: vertical-rl;
          text-orientation: mixed;
          opacity: 0.8;
        }
        .sidebar-numbers-container {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          max-height: 50lvh;
          overflow-y: scroll;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 0.25rem;
        }
        .sidebar-numbers-container::-webkit-scrollbar {
          display: none;
        }
        .sidebar-num-btn {
          position: relative;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background-color: var(--bg-surface-solid);
          color: var(--text-primary);
          font-size: 0.8125rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .sidebar-num-btn:hover {
          background-color: var(--primary-subtle);
          border-color: var(--primary);
        }
        .sidebar-num-btn.active {
          background-color: #000000;
          color: #ffffff;
          border-color: #000000;
        }
        .sidebar-num-btn .answered-dot {
          position: absolute;
          top: 0px;
          right: 0px;
          width: 8px;
          height: 8px;
          background-color: #22c55e;
          border-radius: 50%;
          border: 1px solid var(--bg-surface-solid);
        }
        .question-card.has-error {
          border-color: var(--danger) !important;
          background-color: var(--danger-bg) !important;
          box-shadow: 0 0 0 3px var(--danger-border) !important;
        }
        .sidebar-num-btn.answered {
          background-color: var(--success-bg);
          color: var(--success-foreground);
          border-color: var(--success);
        }
        .sidebar-num-btn.answered.active {
          background-color: #000000;
          color: #ffffff;
          border-color: #000000;
        }
        .sidebar-num-btn.has-error {
          background-color: var(--danger-bg);
          color: var(--danger-foreground);
          border-color: var(--danger);
        }
        .sidebar-num-btn.has-error.active {
          background-color: var(--danger);
          color: #ffffff;
          border-color: #000000;
        }
        @media (max-width: 768px) {
          .questionnaire-main-content {
            max-width: calc(100% - 48px);
          }
          .question-sidebar-nav {
            right: 0.5rem;
            padding: 0.5rem 0.25rem;
          }
          .sidebar-num-btn {
            width: 28px;
            height: 28px;
            font-size: 0.75rem;
          }
          .sticky-patient-bar {
            top: 0px;
            padding: 0.75rem 1rem;
          }
        }
      `}</style>

      <div>
        {/* Status feedback alerts */}
        {error && (
          <div className="alert alert-danger" role="alert">
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success" role="alert" style={{ whiteSpace: 'pre-line' }}>
            <span>{success}</span>
          </div>
        )}

        {/* STEP 1: Search Patient */}
        {!selectedPatient ? (
          <div className="dashboard-card">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>ค้นหาประวัติคนไข้เพื่อเริ่มทำประเมิน [ระบบทดสอบออฟไลน์]</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              โปรดค้นหาด้วยหมายเลขทะเบียนประวัติผู้ป่วย (HN) หรือ ค้นหาด้วย ชื่อ-นามสกุล ของคนไข้ (ระบบทำการจำลองรายชื่อออฟไลน์)
            </p>

            <form onSubmit={handleSearchSubmit} className="search-form" style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
              <input
                type="text"
                className="form-input"
                style={{ flexGrow: 1 }}
                placeholder="พิมพ์ HN หรือ ชื่อ-นามสกุล คนไข้..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0 2rem' }} disabled={searchingPatients}>
                {searchingPatients ? 'กำลังค้นหา...' : 'ค้นหา'}
              </button>
            </form>

            {searchingPatients ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                <p style={{ color: 'var(--text-secondary)' }}>กำลังดึงข้อมูลรายชื่อคนไข้...</p>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                  {searchQuery ? 'ผลลัพธ์การค้นหาคนไข้' : 'รายชื่อคนไข้ทดสอบจำลอง'}
                </h3>

                {patients.length === 0 ? (
                  <div className="dashboard-placeholder" style={{ padding: '3rem 1rem' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--text-muted)' }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <line x1="23" y1="11" x2="17" y2="11"/>
                    </svg>
                    <p style={{ fontWeight: 600, marginTop: '1rem' }}>ไม่พบข้อมูลคนไข้</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      ลองค้นหาชื่ออื่น เช่น "สมชาย" หรือ "ปรีชา"
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>HN</th>
                          <th>ชื่อ - นามสกุล</th>
                          <th>เพศ</th>
                          <th>อายุ</th>
                          <th>สิทธิ์การรักษา</th>
                          <th style={{ textAlign: 'right' }}>การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients.map(p => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.hn}</td>
                            <td>{`${p.title}${p.first_name} ${p.last_name}`}</td>
                            <td>{p.gender}</td>
                            <td>{calculateAge(p.date_of_birth)} ปี</td>
                            <td>
                              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>{p.medical_right}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.8125rem' }}
                                onClick={() => setSelectedPatient(p)}
                              >
                                ทำแบบสอบถาม
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* STEP 2: Load Questionnaire & Render Form */
          <div>
            {/* STICKY PATIENT HEADER BAR */}
            <div className="sticky-patient-bar" role="region" aria-label="ข้อมูลคนไข้และสถิติประเมิน">
              <div className="patient-info-text">
                <span className="patient-info-badge">โหมดออฟไลน์</span>
                <span>
                  ชื่อคนไข้: <strong style={{ color: 'var(--primary)' }}>{`${selectedPatient.title}${selectedPatient.first_name} ${selectedPatient.last_name}`}</strong>
                </span>
                <span>
                  HN: <strong>{selectedPatient.hn}</strong>
                </span>
                <span>
                  เพศ: <strong>{selectedPatient.gender}</strong>
                </span>
                <span>
                  อายุ: <strong>{calculateAge(selectedPatient.date_of_birth)} ปี</strong>
                </span>
              </div>
              
              <div className="sticky-bar-actions">
                <span className="sticky-bar-progress" aria-live="polite">
                  ตอบแล้ว: <strong>{getAnsweredCount()}</strong> / {questions.length} ข้อ
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8125rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  onClick={handleFillMock}
                >
                  กรอกข้อมูลจำลอง
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8125rem', borderColor: 'var(--danger-border)', color: 'var(--danger)' }}
                  onClick={() => setSelectedPatient(null)}
                >
                  เปลี่ยนคนไข้
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '0.5rem 1.25rem', fontSize: '0.8125rem' }}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'ส่งแบบสอบถาม'}
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                <p style={{ color: 'var(--text-secondary)' }}>กำลังจัดเตรียมหัวข้อคำถามทดสอบ...</p>
              </div>
            ) : (
              <div className="questionnaire-layout">
                {/* MAIN QUESTION LIST */}
                <form className="questionnaire-main-content" onSubmit={handleSubmit} noValidate>
                  {questionnaire && (
                    <div className="dashboard-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--bg-surface-solid) 0%, var(--primary-subtle) 100%)' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-hover)', marginBottom: '0.5rem' }}>
                        {questionnaire.title}
                      </h2>
                      {questionnaire.description && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                          {questionnaire.description}
                        </p>
                      )}
                    </div>
                  )}

                  {questions.map((q, index) => {
                    const isActive = index === activeQuestionIndex;
                    const qOpts = options[q.id] || [];
                    const isAnswered = isQuestionAnswered(q.id, q.question_type);

                    return (
                      <div
                        key={q.id}
                        id={`question-num-${index + 1}`}
                        className={`question-card ${isActive ? 'active' : ''} ${validationErrors[q.id] ? 'has-error' : ''}`}
                        style={{
                          borderLeft: validationErrors[q.id] 
                            ? '4px solid var(--danger)' 
                            : isAnswered 
                              ? '4px solid #22c55e' 
                              : '4px solid var(--border-color)'
                        }}
                      >
                        <h4 className="question-title">
                          <span>{q.question_text}</span>
                          {q.is_required && (
                            <span className="required-star" title="จำเป็นต้องตอบ">*</span>
                          )}
                        </h4>

                        {/* Render Inputs dynamically based on question_type */}
                        {q.question_type === 'text' && (
                          <textarea
                            className="form-input"
                            style={{ width: '100%', minHeight: '80px', borderRadius: 'var(--radius-md)' }}
                            placeholder="พิมพ์ข้อมูลข้อความระบุตรงนี้..."
                            value={answers[q.id]?.answer_text || ''}
                            onChange={(e) => updateAnswerText(q.id, e.target.value)}
                            aria-label={`ข้อ ${index + 1}: พิมพ์คำตอบของท่าน`}
                          />
                        )}

                        {q.question_type === 'number' && (
                          <input
                            type="number"
                            className="form-input"
                            style={{ maxWidth: '240px' }}
                            placeholder="ระบุตัวเลขจำนวน..."
                            value={answers[q.id]?.answer_number !== undefined ? answers[q.id]?.answer_number : ''}
                            onChange={(e) => updateAnswerNumber(q.id, e.target.value)}
                            aria-label={`ข้อ ${index + 1}: ระบุตัวเลข`}
                          />
                        )}

                        {q.question_type === 'radio' && (
                          <div className="options-grid">
                            {qOpts.map(opt => {
                              const isChecked = answers[q.id]?.selected_option_id === opt.id;
                              return (
                                <label
                                  key={opt.id}
                                  className={`option-label ${isChecked ? 'checked' : ''}`}
                                >
                                  <input
                                    type="radio"
                                    name={`radio-group-${q.id}`}
                                    checked={isChecked}
                                    onChange={() => updateAnswerRadio(q.id, opt.id, opt.option_value)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  <span>{opt.option_text}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {q.question_type === 'checkbox' && (
                          <div className="options-grid">
                            {qOpts.map(opt => {
                              const isChecked = (answers[q.id]?.checkbox_selections || []).includes(opt.id);
                              return (
                                <label
                                  key={opt.id}
                                  className={`option-label ${isChecked ? 'checked' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => updateAnswerCheckbox(q.id, opt.id, e.target.checked)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  <span>{opt.option_text}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {q.question_type === 'scale' && (
                          <div className="scale-options-container">
                            {qOpts.map(opt => {
                              const isChecked = answers[q.id]?.selected_option_id === opt.id;
                              return (
                                <button
                                  type="button"
                                  key={opt.id}
                                  className={`scale-option-btn ${isChecked ? 'checked' : ''}`}
                                  onClick={() => updateAnswerRadio(q.id, opt.id, opt.option_value)}
                                  aria-label={`ระดับคะแนน ${opt.option_text}`}
                                >
                                  <span>{opt.option_text}</span>
                                  {opt.option_value !== null && (
                                    <span className="scale-badge">{opt.option_value}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Bottom buttons */}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingBottom: '4rem' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flexGrow: 2 }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งและบันทึกข้อมูลแบบสอบถาม'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flexGrow: 1, borderColor: 'var(--primary)', color: 'var(--primary)' }}
                      onClick={handleFillMock}
                    >
                      กรอกข้อมูลจำลอง
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flexGrow: 1 }}
                      onClick={handleReset}
                    >
                      ล้างคำตอบ
                    </button>
                  </div>
                </form>

                {/* FLOATING RIGHT SIDEBAR */}
                <aside 
                  className="question-sidebar-nav" 
                  role="navigation" 
                  aria-label="เมนูนำทางด่วนข้อคำถาม"
                >
                  <span className="question-sidebar-title">Questions</span>
                  <div 
                    className="sidebar-numbers-container" 
                    ref={sidebarContainerRef}
                  >
                    {questions.map((q, idx) => {
                      const isActive = idx === activeQuestionIndex;
                      const isAnswered = isQuestionAnswered(q.id, q.question_type);
                      const hasError = validationErrors[q.id];
                      
                      return (
                        <button
                          type="button"
                          key={q.id}
                          ref={el => { sidebarButtonsRef.current[idx] = el; }}
                          onClick={() => scrollToQuestion(idx)}
                          className={`sidebar-num-btn ${isActive ? 'active' : ''} ${isAnswered ? 'answered' : ''} ${hasError ? 'has-error' : ''}`}
                          aria-label={`ไปที่คำถามข้อที่ ${idx + 1}`}
                          title={`คำถามข้อที่ ${idx + 1} ${isAnswered ? '(ตอบแล้ว)' : ''} ${hasError ? '(ยังไม่ได้ตอบ)' : ''}`}
                        >
                          <span>{idx + 1}</span>
                          {isAnswered && (
                            <span className="answered-dot" aria-hidden="true" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </aside>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default QuestionnairePage;
