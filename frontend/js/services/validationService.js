// ── Validation Service ────────────────────────────────────────────────────────
export const validationService = {
  isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },
  isPhone(value) {
    return /^[+\d\s\-()]{7,15}$/.test(value);
  },
  isRequired(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
  },
  minLength(value, min) {
    return String(value).length >= min;
  },
  isLatitude(v)  { return !isNaN(v) && v >= -90  && v <= 90; },
  isLongitude(v) { return !isNaN(v) && v >= -180 && v <= 180; },

  /** Validate a plain object against a schema. Returns { valid, errors } */
  validate(data, schema) {
    const errors = {};
    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      if (rules.required && !this.isRequired(value)) {
        errors[field] = `${rules.label || field} is required.`;
        continue;
      }
      if (value && rules.email && !this.isEmail(value)) {
        errors[field] = 'Enter a valid email address.';
      }
      if (value && rules.phone && !this.isPhone(value)) {
        errors[field] = 'Enter a valid phone number.';
      }
      if (value && rules.minLength && !this.minLength(value, rules.minLength)) {
        errors[field] = `Minimum ${rules.minLength} characters required.`;
      }
    }
    return { valid: Object.keys(errors).length === 0, errors };
  },

  showErrors(errors, formEl) {
    formEl.querySelectorAll('.form-error').forEach(el => el.remove());
    for (const [field, msg] of Object.entries(errors)) {
      const input = formEl.querySelector(`[name="${field}"]`);
      if (input) {
        const err = document.createElement('div');
        err.className = 'form-error';
        err.innerHTML = `<i class="fa fa-exclamation-circle"></i> ${msg}`;
        input.closest('.form-group')?.appendChild(err);
      }
    }
  },
};
