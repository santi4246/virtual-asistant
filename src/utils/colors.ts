const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";

export function colorizeAudit(text: string): string {  
  return `${BOLD}${CYAN}${text}${RESET}`;
}

export function colorizeStatus(status: string, text: string): string {  
  switch (status) {
    case "completed": return `${GREEN}${text}${RESET}`;
    case "waiting": return `${YELLOW}${text}${RESET}`;
    case "failed": return `${RED}${text}${RESET}`;
    default: return text;
  }
}

export function highlightAuditPrefix(message: string): string {
  if (!message.startsWith("AUDIT: ")) return message;  
  const prefix = "AUDIT: ";
  return `${BOLD}${CYAN}${prefix}${RESET}${message.slice(prefix.length)}`;
}