"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Trophy, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import type { QuizQuestion } from "@/lib/course-data"

interface QuizEngineProps {
  questions: QuizQuestion[]
  onComplete: (score: number, passed: boolean) => void
  passingScore?: number // percentage (default 70)
  className?: string
}

export function QuizEngine({
  questions,
  onComplete,
  passingScore = 70,
  className,
}: QuizEngineProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [showResult, setShowResult] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [score, setScore] = useState(0)

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  useEffect(() => {
    // Load previously selected answer if exists
    if (answers[currentQuestionIndex] !== undefined) {
      setSelectedAnswer(answers[currentQuestionIndex])
    } else {
      setSelectedAnswer(null)
    }
    setShowResult(false)
    setShowExplanation(false)
  }, [currentQuestionIndex, answers])

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult || isCompleted) return
    setSelectedAnswer(answerIndex)
  }

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return

    setShowResult(true)
    setShowExplanation(true)
    setAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: selectedAnswer,
    }))

    // Check if correct
    if (selectedAnswer === currentQuestion.correctAnswer) {
      setScore((prev) => prev + 1)
    }
  }

  const handleNext = () => {
    if (isLastQuestion) {
      handleComplete()
    } else {
      setCurrentQuestionIndex((prev) => prev + 1)
    }
  }

  const handleComplete = () => {
    const finalScore = (score / questions.length) * 100
    const passed = finalScore >= passingScore
    setIsCompleted(true)
    onComplete(finalScore, passed)
  }

  const handleRetake = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setAnswers({})
    setShowResult(false)
    setShowExplanation(false)
    setIsCompleted(false)
    setScore(0)
  }

  if (isCompleted) {
    const finalScore = (score / questions.length) * 100
    const passed = finalScore >= passingScore

    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            {passed ? (
              <>
                <div className="rounded-full bg-green-100 p-6">
                  <Trophy className="h-16 w-16 text-green-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-green-600 mb-2">Congratulations!</h2>
                  <p className="text-lg text-gray-600">You passed the quiz</p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-full bg-red-100 p-6">
                  <AlertCircle className="h-16 w-16 text-red-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-red-600 mb-2">Quiz Failed</h2>
                  <p className="text-lg text-gray-600">You need {passingScore}% to pass</p>
                </div>
              </>
            )}

            <div className="w-full max-w-md space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Your Score:</span>
                <span className="text-2xl font-bold">{Math.round(finalScore)}%</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Correct Answers:</span>
                <span className="text-2xl font-bold">
                  {score} / {questions.length}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Passing Score:</span>
                <span className="text-2xl font-bold">{passingScore}%</span>
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleRetake} variant="outline" size="lg">
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake Quiz
              </Button>
              {passed && (
                <Button onClick={() => window.location.reload()} size="lg">
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isCorrect = selectedAnswer === currentQuestion.correctAnswer
  const hasAnswered = answers[currentQuestionIndex] !== undefined

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-xl">
            Question {currentQuestionIndex + 1} of {questions.length}
          </CardTitle>
          <span className="text-sm text-gray-500">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">{currentQuestion.question}</h3>
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index
              const isCorrectOption = index === currentQuestion.correctAnswer
              const showCorrect = showResult && isCorrectOption
              const showIncorrect = showResult && isSelected && !isCorrectOption

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showResult || isCompleted}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 transition-all",
                    "hover:bg-gray-50 disabled:cursor-not-allowed",
                    isSelected && !showResult && "border-blue-500 bg-blue-50",
                    showCorrect && "border-green-500 bg-green-50",
                    showIncorrect && "border-red-500 bg-red-50",
                    !isSelected && !showResult && "border-gray-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "flex-1",
                      showCorrect && "text-green-700 font-semibold",
                      showIncorrect && "text-red-700",
                      isSelected && !showResult && "text-blue-700"
                    )}>
                      {option}
                    </span>
                    {showCorrect && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 ml-2" />
                    )}
                    {showIncorrect && (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {showExplanation && currentQuestion.explanation && (
          <Alert className={cn(
            isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          )}>
            <AlertDescription className={cn(
              isCorrect ? "text-green-800" : "text-red-800"
            )}>
              <strong>Explanation:</strong> {currentQuestion.explanation}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>

          {!hasAnswered ? (
            <Button
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === null}
            >
              Submit Answer
            </Button>
          ) : (
            <Button onClick={handleNext}>
              {isLastQuestion ? "Finish Quiz" : "Next Question"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

