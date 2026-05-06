const ValidatePhone = (value)=> {
  if (!value) return { valid: false, message: "Numéro requis" };
  const cleaned = value.replace(/\s+/g, "");
  const match = cleaned.match(/^(\+?226)?(\d{8})$/);
  if (!match) {
    return {
      valid: false,
      message: "Numéro invalide. Ex : 70000000 ou +22670000000",
    };
  }
  const local = match[2];
  return { valid: true, formatted: `226${local}` };
};
export default ValidatePhone;