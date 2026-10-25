export interface PasswordValidationResult {
	isValid: boolean;
	hasMinLength: boolean;
	hasNumber: boolean;
	hasSpecialChar: boolean;
	errorMessage?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
	const str = password || '';
	const hasMinLength = str.length >= 8;
	const hasNumber = /\d/.test(str);
	const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(str);
	const isValid = hasMinLength && hasNumber && hasSpecialChar;

	let errorMessage: string | undefined;
	if (!hasMinLength) {
		errorMessage = 'Password must be at least 8 characters long.';
	} else if (!hasNumber) {
		errorMessage = 'Password must contain at least one number (0-9).';
	} else if (!hasSpecialChar) {
		errorMessage = 'Password must contain at least one special character (e.g. !@#$%^&*).';
	}

	return {
		isValid,
		hasMinLength,
		hasNumber,
		hasSpecialChar,
		errorMessage
	};
}
