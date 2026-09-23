/**
 * Password policy shared by the admin forms. The backend is authoritative and
 * enforces exactly these bounds in its request schemas; the frontend mirrors
 * them only for immediate feedback and never invents stronger rules.
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 200;