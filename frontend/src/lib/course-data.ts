export type ComponentType = "transformer" | "bayLines" | "isolator" | "circuitBreaker"

export type VideoType = "workingPrinciple" | "operation" | "faults" | "safety"

export interface Video {
  id: string
  type: VideoType
  title: string
  description: string
  url: string
  thumbnail: string
  duration: number // in seconds
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number // index of correct option
  category: "workingPrinciple" | "operation" | "faults" | "mixed"
  explanation?: string
}

export interface ComponentCourse {
  id: ComponentType
  name: string
  description: string
  icon: string
  videos: Video[]
  quiz: QuizQuestion[]
}

export const courseData: ComponentCourse[] = [
  {
    id: "transformer",
    name: "Transformer",
    description: "Learn about transformer working principles, operations, and fault handling",
    icon: "⚡",
    videos: [
      {
        id: "transformer-wp",
        type: "workingPrinciple",
        title: "Transformer Working Principle",
        description: "Understanding Faraday's Law of Electromagnetic Induction and how transformers step up or step down voltage",
        url: "/api/course-video?componentId=transformer&videoType=workingPrinciple",
        thumbnail: "/placeholder.jpg",
        duration: 600,
      },
      {
        id: "transformer-op",
        type: "operation",
        title: "Transformer Operation",
        description: "Learn about tap changers, Buchholz relay, and transformer operational procedures",
        url: "/api/course-video?componentId=transformer&videoType=operation",
        thumbnail: "/placeholder.jpg",
        duration: 720,
      },
    ],
    quiz: [
      {
        id: "t1",
        question: "What is the working principle of a transformer?",
        options: [
          "Faraday's Law of Electromagnetic Induction",
          "Ohm's Law",
          "Lenz's Law",
          "Fleming's Rule",
        ],
        correctAnswer: 0,
        category: "workingPrinciple",
        explanation: "Transformers operate based on Faraday's Law of Electromagnetic Induction, where a changing magnetic field induces voltage in a secondary coil.",
      },
      {
        id: "t2",
        question: "Why does a transformer operate only on AC?",
        options: [
          "AC creates a changing magnetic flux",
          "DC improves efficiency",
          "DC produces higher voltage",
          "AC reduces core losses",
        ],
        correctAnswer: 0,
        category: "workingPrinciple",
        explanation: "AC creates a changing magnetic flux which is essential for electromagnetic induction to occur in transformers.",
      },
      {
        id: "t3",
        question: "What is the function of the tap changer?",
        options: [
          "To cool the transformer",
          "To adjust output voltage",
          "To increase frequency",
          "To reduce current",
        ],
        correctAnswer: 1,
        category: "operation",
        explanation: "Tap changers allow adjustment of the transformer's turns ratio to maintain output voltage within acceptable limits.",
      },
      {
        id: "t4",
        question: "What does Buchholz relay detect?",
        options: [
          "External faults",
          "Overvoltage",
          "Gas accumulation & internal faults",
          "Overload protection",
        ],
        correctAnswer: 2,
        category: "operation",
        explanation: "Buchholz relay detects gas accumulation and internal faults in oil-immersed transformers by monitoring gas bubbles.",
      },
      {
        id: "t5",
        question: "Which of the following indicates a winding fault?",
        options: [
          "Low oil level",
          "High differential current",
          "Low load",
          "Stable temperature",
        ],
        correctAnswer: 1,
        category: "faults",
        explanation: "High differential current indicates an imbalance between primary and secondary currents, often caused by winding faults.",
      },
      {
        id: "t6",
        question: "Sudden rise in transformer oil temperature indicates:",
        options: [
          "Cooling fan fault",
          "Internal short circuit",
          "Tap changer stuck",
          "Normal load",
        ],
        correctAnswer: 1,
        category: "faults",
        explanation: "A sudden rise in oil temperature typically indicates an internal short circuit or excessive current flow.",
      },
      {
        id: "t7",
        question: "What is the primary purpose of transformer cooling?",
        options: [
          "To increase efficiency",
          "To maintain safe operating temperature",
          "To reduce noise",
          "To increase voltage",
        ],
        correctAnswer: 1,
        category: "operation",
      },
      {
        id: "t8",
        question: "Transformer oil serves which primary function?",
        options: [
          "Only cooling",
          "Cooling and insulation",
          "Only insulation",
          "Voltage regulation",
        ],
        correctAnswer: 1,
        category: "workingPrinciple",
      },
      {
        id: "t9",
        question: "What causes transformer humming noise?",
        options: [
          "Loose connections",
          "Magnetostriction in core",
          "Oil contamination",
          "High load",
        ],
        correctAnswer: 1,
        category: "operation",
      },
      {
        id: "t10",
        question: "Differential relay trips transformer. Likely cause?",
        options: [
          "Wrong VT burden",
          "Internal winding fault",
          "Cooling fan noise",
          "Low oil temperature",
        ],
        correctAnswer: 1,
        category: "faults",
        explanation: "Differential relays trip when there's an imbalance between primary and secondary currents, often indicating internal winding faults.",
      },
    ],
  },
  {
    id: "bayLines",
    name: "Bays Components",
    description: "Learn about CT and VT components in bays",
    icon: "🔌",
    videos: [
      {
        id: "baylines-wp",
        type: "workingPrinciple",
        title: "Bays Components Working Principle",
        description: "Understanding CT and VT principles, electromagnetic induction, and voltage/current transformation",
        url: "/api/course-video?componentId=bayLines&videoType=workingPrinciple",
        thumbnail: "/placeholder.jpg",
        duration: 600,
      },
      {
        id: "baylines-op",
        type: "operation",
        title: "Bays Components Operation",
        description: "CT and VT operation, burden, accuracy classes, connection methods, and safety protocols",
        url: "/api/course-video?componentId=bayLines&videoType=operation",
        thumbnail: "/placeholder.jpg",
        duration: 720,
      },
    ],
    quiz: [
      {
        id: "bl1",
        question: "What is the purpose of a CT?",
        options: [
          "Step down voltage",
          "Step up current",
          "Step down current for measurement & protection",
          "Store energy",
        ],
        correctAnswer: 2,
        category: "workingPrinciple",
        explanation: "CTs step down high primary current to a safe, measurable secondary current for metering and protection devices.",
      },
      {
        id: "bl2",
        question: "CTs work based on which principle?",
        options: [
          "Electromagnetic Induction",
          "Electrostatics",
          "Photoelectric effect",
          "Magnetoresistance",
        ],
        correctAnswer: 0,
        category: "workingPrinciple",
      },
      {
        id: "bl3",
        question: "What happens if you open-circuit a CT secondary?",
        options: [
          "Nothing",
          "CT explodes",
          "Very high voltage is induced, dangerous",
          "The CT saturates immediately",
        ],
        correctAnswer: 2,
        category: "operation",
        explanation: "Opening a CT secondary creates a very high voltage that can be dangerous to personnel and equipment.",
      },
      {
        id: "bl4",
        question: "Burden in a CT refers to:",
        options: [
          "Core losses",
          "Load connected to secondary",
          "Copper weight",
          "Fault current",
        ],
        correctAnswer: 1,
        category: "operation",
        explanation: "Burden is the total impedance connected to the CT secondary, including wires and connected devices.",
      },
      {
        id: "bl5",
        question: "CT saturation leads to:",
        options: [
          "Incorrect relay operation",
          "Overvoltage at primary",
          "Increase in frequency",
          "Increase in secondary power",
        ],
        correctAnswer: 0,
        category: "faults",
        explanation: "CT saturation causes distorted secondary current, leading to incorrect measurements and relay misoperation.",
      },
      {
        id: "bl6",
        question: "A loose CT terminal can cause:",
        options: [
          "Excess oil leakage",
          "False tripping or no tripping",
          "Transformer heating",
          "Tap changer misalignment",
        ],
        correctAnswer: 1,
        category: "faults",
        explanation: "Loose connections can cause intermittent contact, leading to false signals or loss of protection.",
      },
      {
        id: "bl7",
        question: "VT operates based on:",
        options: [
          "Mutual inductance",
          "Static induction",
          "Photo conduction",
          "Reactance change",
        ],
        correctAnswer: 0,
        category: "workingPrinciple",
      },
      {
        id: "bl8",
        question: "Main purpose of VT:",
        options: [
          "Step up voltage",
          "Step down voltage for measurement & protection",
          "Increase current",
          "Reduce frequency",
        ],
        correctAnswer: 1,
        category: "workingPrinciple",
        explanation: "VTs step down high system voltage to a safe, standardized level (typically 110V or 63.5V) for metering and protection.",
      },
      {
        id: "bl9",
        question: "VT secondary must always be:",
        options: [
          "Open",
          "Shorted",
          "Loaded",
          "Earthed",
        ],
        correctAnswer: 3,
        category: "operation",
        explanation: "VT secondary must be earthed for safety and to provide a reference point for voltage measurements.",
      },
      {
        id: "bl10",
        question: "Accuracy of VT depends on:",
        options: [
          "Temperature",
          "Burden",
          "Primary short",
          "Oil level",
        ],
        correctAnswer: 1,
        category: "operation",
        explanation: "VT accuracy is significantly affected by the burden (load) connected to its secondary.",
      },
      {
        id: "bl11",
        question: "VT failure during switching can cause:",
        options: [
          "Ferro-resonance",
          "Load drop",
          "Tap failure",
          "Overcurrent",
        ],
        correctAnswer: 0,
        category: "faults",
        explanation: "Ferro-resonance can occur during switching operations, causing dangerous overvoltages in VT circuits.",
      },
      {
        id: "bl12",
        question: "Frequent CT false trips indicate:",
        options: [
          "Correct burden",
          "Loose secondary connection",
          "Strong magnetic core",
          "High insulation",
        ],
        correctAnswer: 1,
        category: "faults",
        explanation: "Loose secondary connections can cause intermittent signals that trigger false protection operations.",
      },
    ],
  },
  {
    id: "isolator",
    name: "Isolator",
    description: "Understand isolator operation, maintenance, and safety",
    icon: "🔧",
    videos: [
      {
        id: "isolator-wp",
        type: "workingPrinciple",
        title: "Isolator Working Principle",
        description: "Understanding isolator function, types, and when to operate",
        url: "/api/course-video?componentId=isolator&videoType=workingPrinciple",
        thumbnail: "/placeholder.jpg",
        duration: 420,
      },
      {
        id: "isolator-op",
        type: "operation",
        title: "Isolator Operation",
        description: "Proper isolator operation procedures, interlocking, and safety protocols",
        url: "/api/course-video?componentId=isolator&videoType=operation",
        thumbnail: "/placeholder.jpg",
        duration: 540,
      },
    ],
    quiz: [
      {
        id: "i1",
        question: "Isolator is operated when:",
        options: [
          "Line is energized",
          "No load condition",
          "During short circuit",
          "During switching",
        ],
        correctAnswer: 1,
        category: "operation",
        explanation: "Isolators must only be operated under no-load conditions to prevent dangerous arcing.",
      },
      {
        id: "i2",
        question: "Primary purpose of isolator:",
        options: [
          "Protection",
          "Isolation for maintenance",
          "Arc interruption",
          "Voltage regulation",
        ],
        correctAnswer: 1,
        category: "workingPrinciple",
        explanation: "Isolators provide visible isolation for maintenance and safety purposes.",
      },
      {
        id: "i3",
        question: "Isolator cannot break load because:",
        options: [
          "It is slow",
          "It has no arc-quenching medium",
          "It cannot move contacts",
          "It overheats",
        ],
        correctAnswer: 1,
        category: "workingPrinciple",
        explanation: "Isolators lack arc-quenching capability, so they cannot safely interrupt load current.",
      },
      {
        id: "i4",
        question: "Isolator mechanical jam is caused by:",
        options: [
          "Rusting",
          "Low load",
          "High voltage",
          "No earthing",
        ],
        correctAnswer: 0,
        category: "faults",
        explanation: "Mechanical jams are often caused by rust, corrosion, or lack of maintenance.",
      },
      {
        id: "i5",
        question: "Incorrect isolator operation may lead to:",
        options: [
          "Transformer failure",
          "Line energization during maintenance",
          "Cooling loss",
          "Relay miscoordination",
        ],
        correctAnswer: 1,
        category: "faults",
        explanation: "Incorrect operation can result in dangerous situations where lines are energized during maintenance.",
      },
      {
        id: "i6",
        question: "What is the correct sequence for opening an isolator?",
        options: [
          "Open breaker, then isolator",
          "Open isolator, then breaker",
          "Open both simultaneously",
          "No specific sequence",
        ],
        correctAnswer: 0,
        category: "operation",
      },
      {
        id: "i7",
        question: "Isolator interlocking prevents:",
        options: [
          "Overheating",
          "Operation under load",
          "Visual inspection",
          "Maintenance",
        ],
        correctAnswer: 1,
        category: "operation",
      },
      {
        id: "i8",
        question: "What type of isolator is used for outdoor substations?",
        options: [
          "Pantograph type",
          "Horizontal break type",
          "Vertical break type",
          "All of the above",
        ],
        correctAnswer: 3,
        category: "workingPrinciple",
      },
      {
        id: "i9",
        question: "Isolator provides:",
        options: [
          "Visible isolation",
          "Arc interruption",
          "Overcurrent protection",
          "Voltage regulation",
        ],
        correctAnswer: 0,
        category: "workingPrinciple",
      },
      {
        id: "i10",
        question: "Before operating isolator, you must:",
        options: [
          "Check breaker is closed",
          "Check breaker is open",
          "Increase load",
          "Reduce voltage",
        ],
        correctAnswer: 1,
        category: "operation",
      },
    ],
  },
  {
    id: "circuitBreaker",
    name: "Circuit Breaker",
    description: "Master circuit breaker operation, arc quenching, and fault handling",
    icon: "⚙️",
    videos: [
      {
        id: "cb-wp",
        type: "workingPrinciple",
        title: "Circuit Breaker Working Principle",
        description: "Understanding arc quenching mechanisms and breaker types (SF6, Vacuum, Air)",
        url: "/api/course-video?componentId=circuitBreaker&videoType=workingPrinciple",
        thumbnail: "/placeholder.jpg",
        duration: 600,
      },
      {
        id: "cb-op",
        type: "operation",
        title: "Circuit Breaker Operation",
        description: "Closing and tripping operations, control circuits, and operational procedures",
        url: "/api/course-video?componentId=circuitBreaker&videoType=operation",
        thumbnail: "/placeholder.jpg",
        duration: 660,
      },
    ],
    quiz: [
      {
        id: "cb1",
        question: "Circuit breaker interrupts current using:",
        options: [
          "Manual force",
          "Arc quenching mechanism",
          "Transformers",
          "Inductive reactance",
        ],
        correctAnswer: 1,
        category: "workingPrinciple",
        explanation: "Circuit breakers use various arc quenching mediums (SF6, vacuum, air) to extinguish the arc when contacts separate.",
      },
      {
        id: "cb2",
        question: "GIS circuit breakers use which medium?",
        options: [
          "Air",
          "Vacuum",
          "SF6",
          "Oil",
        ],
        correctAnswer: 2,
        category: "workingPrinciple",
        explanation: "Gas Insulated Switchgear (GIS) uses SF6 gas as both insulation and arc quenching medium.",
      },
      {
        id: "cb3",
        question: "What happens during breaker close operation?",
        options: [
          "Contacts separate",
          "Arc forms",
          "Relay activates",
          "Contacts come together to complete circuit",
        ],
        correctAnswer: 3,
        category: "operation",
        explanation: "Closing operation brings the contacts together to complete the circuit and allow current flow.",
      },
      {
        id: "cb4",
        question: "Breaker's closing coil is used for:",
        options: [
          "Tripping",
          "Cooling",
          "Manual operation",
          "Closing the breaker",
        ],
        correctAnswer: 3,
        category: "operation",
      },
      {
        id: "cb5",
        question: "High arc duration indicates:",
        options: [
          "Contact wear",
          "High oil level",
          "Good health",
          "Relay failure",
        ],
        correctAnswer: 0,
        category: "faults",
        explanation: "Prolonged arcing indicates worn contacts or degraded arc quenching capability.",
      },
      {
        id: "cb6",
        question: "Breaker fails to close because:",
        options: [
          "Coil burnt",
          "Tap changer fault",
          "CT error",
          "Low VT voltage",
        ],
        correctAnswer: 0,
        category: "faults",
        explanation: "A burnt closing coil prevents the breaker from closing as the mechanism cannot be energized.",
      },
      {
        id: "cb7",
        question: "Breaker does not open during fault. Why?",
        options: [
          "Trip coil failure",
          "High oil level",
          "Low CT ratio",
          "Good health",
        ],
        correctAnswer: 0,
        category: "faults",
        explanation: "Trip coil failure prevents the breaker from opening, which is a critical safety issue.",
      },
      {
        id: "cb8",
        question: "What is the purpose of breaker interlocking?",
        options: [
          "Prevent simultaneous closing",
          "Ensure proper sequence",
          "Prevent dangerous operations",
          "All of the above",
        ],
        correctAnswer: 3,
        category: "operation",
      },
      {
        id: "cb9",
        question: "SF6 breaker requires:",
        options: [
          "Regular oil changes",
          "Gas pressure monitoring",
          "Water cooling",
          "No maintenance",
        ],
        correctAnswer: 1,
        category: "operation",
      },
      {
        id: "cb10",
        question: "What indicates a healthy circuit breaker?",
        options: [
          "Fast operation time",
          "Low contact resistance",
          "Proper arc quenching",
          "All of the above",
        ],
        correctAnswer: 3,
        category: "operation",
      },
    ],
  },
]

// Helper function to get random quiz questions
export function getRandomQuizQuestions(
  component: ComponentType,
  count: number = 10
): QuizQuestion[] {
  const course = courseData.find((c) => c.id === component)
  if (!course) return []

  const questions = [...course.quiz]
  const selected: QuizQuestion[] = []

  // Shuffle and select
  for (let i = 0; i < Math.min(count, questions.length); i++) {
    const randomIndex = Math.floor(Math.random() * questions.length)
    selected.push(questions.splice(randomIndex, 1)[0])
  }

  return selected
}
