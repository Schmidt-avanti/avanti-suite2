
export const lostKeyUseCase = {
  type: "direct_use_case",
  title: "Verlust eines Wohnungsschlüssels",
  information_needed: "Art des Schlüssels, Anzahl der verlorenen Schlüssel, Zugehörigkeit zu einem Schließsystem",
  steps: "Schlüsselidentifikation, Prüfung Schließsystem, Dokumentation, Kostenaufklärung, Weiterleitung",
  typical_activities: "Schlüsselverlust dokumentieren, Schließsystem prüfen, Kostenschätzung",
  expected_result: "Dokumentierter Schlüsselverlust, eingeleiteter Austauschprozess",
  chat_response: {
    title: "Verlust eines Wohnungsschlüssels",
    steps_block: [
      "Können Sie mir bitte sagen, welchen Schlüssel Sie verloren haben?",
      "Ich erkläre Ihnen nun die nächsten Schritte.",
      "Ich prüfe, ob das betroffene Schloss Teil eines Schließsystems ist.",
      "Ich dokumentiere das für Sie.",
      "Bitte beachten Sie, dass unter Umständen Kosten entstehen können.",
      "Ich leite den Vorgang nun an den zuständigen Ansprechpartner weiter."
    ],
    tone: "freundlich-direkt"
  },
  next_question: "Können Sie mir bitte sagen, welchen Schlüssel Sie verloren haben?"
};
