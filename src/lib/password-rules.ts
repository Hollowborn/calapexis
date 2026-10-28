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

export interface EmailValidationResult {
	isValid: boolean;
	normalizedEmail: string;
	domain: string;
	errorMessage?: string;
}

export const ALLOWED_EMAIL_DOMAINS = ['gmail.com', 'bisu.edu.ph'] as const;

export function validateEmailDomain(email: string): EmailValidationResult {
	const raw = (email || '').trim().toLowerCase();
	if (!raw) {
		return {
			isValid: false,
			normalizedEmail: '',
			domain: '',
			errorMessage: 'Email address is required.'
		};
	}

	const emailRegex = /^[^\s@]+@([^\s@]+)$/;
	const match = raw.match(emailRegex);

	if (!match) {
		return {
			isValid: false,
			normalizedEmail: raw,
			domain: '',
			errorMessage: 'Please enter a valid email ending with @gmail.com or @bisu.edu.ph.'
		};
	}

	const domain = match[1];
	if (!ALLOWED_EMAIL_DOMAINS.includes(domain as any)) {
		return {
			isValid: false,
			normalizedEmail: raw,
			domain,
			errorMessage: 'Only email addresses from @gmail.com and @bisu.edu.ph are permitted.'
		};
	}

	return {
		isValid: true,
		normalizedEmail: raw,
		domain
	};
}
