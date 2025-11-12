// FIX: Removed self-import of validateCPF
export const validateCPF = (cpf: string): boolean => {
  if (!cpf) return false;
  
  const cpfClean = cpf.replace(/[^\d]/g, '');

  if (cpfClean.length !== 11) {
    return false;
  }

  // Check for known invalid CPFs (e.g., '00000000000', '11111111111', etc.)
  if (/^(\d)\1+$/.test(cpfClean)) {
    return false;
  }

  // Validate first verifier digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpfClean.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }
  if (remainder !== parseInt(cpfClean.charAt(9))) {
    return false;
  }

  // Validate second verifier digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpfClean.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }
  if (remainder !== parseInt(cpfClean.charAt(10))) {
    return false;
  }

  return true;
};

export const validateEmail = (email: string): boolean => {
    if (!email) return true; // Not mandatory
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};