export function mapAuthError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  switch (code) {
    case "auth/email-already-in-use":
      return "Questa email è già registrata.";
    case "auth/invalid-email":
      return "Email non valida.";
    case "auth/weak-password":
      return "Password troppo debole (minimo 6 caratteri).";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email o password non corretti.";
    case "auth/popup-closed-by-user":
      return "Accesso con Google annullato.";
    case "auth/too-many-requests":
      return "Troppi tentativi. Riprova tra qualche minuto.";
    default:
      return "Si è verificato un errore. Riprova.";
  }
}
