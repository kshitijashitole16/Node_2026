import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { askAuthAnalyticsAssistant } from "../../api/analyticsApi.js";

const DEFAULT_PROMPTS = [
  "Why are OTP failures increasing?",
  "Show login trend for last 7 days",
  "What should we improve to increase OTP success rate?",
];

function QueryResult({ data }) {
  if (!data) return null;

  const response = data?.response ?? {};
  const parsed = data?.parsedQuery ?? {};
  const insights = Array.isArray(response.insights) ? response.insights : [];
  const suggestions = Array.isArray(response.suggestions) ? response.suggestions : [];

  return (
    <div className="assistant-result">
      <p className="assistant-result__summary">{response.summary || "No summary available."}</p>

      {insights.length > 0 ? (
        <div>
          <p className="assistant-result__label">Insights</p>
          <ul className="assistant-result__list">
            {insights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <div>
          <p className="assistant-result__label">Suggestions</p>
          <ul className="assistant-result__list">
            {suggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="assistant-result__meta">
        Intent: <strong>{parsed.intent || "overview"}</strong> | Source:{" "}
        <strong>{data?.meta?.source || "rule_based"}</strong>
      </p>
    </div>
  );
}

export function AuthAssistantCard({ days = 30 }) {
  const [question, setQuestion] = useState("");
  const prompts = useMemo(() => DEFAULT_PROMPTS, []);

  const askMutation = useMutation({
    mutationFn: (payload) => askAuthAnalyticsAssistant(payload),
  });

  const resultData = askMutation.data?.data ?? null;
  const errorMessage =
    askMutation.error?.data?.error || askMutation.error?.message || "Failed to fetch assistant response";

  const submitQuestion = (nextQuestion) => {
    const normalized = String(nextQuestion ?? "").trim();
    if (!normalized) return;
    askMutation.mutate({
      question: normalized,
      days,
      includeDataPreview: true,
    });
  };

  const onSubmit = (event) => {
    event.preventDefault();
    submitQuestion(question);
  };

  return (
    <section className="assistant-card">
      <header className="assistant-card__head">
        <div>
          <h3 className="assistant-card__title">AI Dashboard Assistant</h3>
          <p className="assistant-card__subtitle">
            Ask questions about auth behavior and get concise insights.
          </p>
        </div>
      </header>

      <form className="assistant-form" onSubmit={onSubmit}>
        <label htmlFor="auth-assistant-question" className="assistant-form__label">
          Ask about logins or OTP performance
        </label>
        <div className="assistant-form__row">
          <input
            id="auth-assistant-question"
            type="text"
            className="assistant-form__input"
            placeholder="e.g. Why are OTP failures increasing?"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={askMutation.isPending}
          />
          <button type="submit" className="assistant-form__submit" disabled={askMutation.isPending}>
            {askMutation.isPending ? "Asking..." : "Ask"}
          </button>
        </div>
      </form>

      <div className="assistant-prompts">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="assistant-prompts__btn"
            onClick={() => {
              setQuestion(prompt);
              submitQuestion(prompt);
            }}
            disabled={askMutation.isPending}
          >
            {prompt}
          </button>
        ))}
      </div>

      {askMutation.isError ? (
        <div className="assistant-error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <QueryResult data={resultData} />
    </section>
  );
}
