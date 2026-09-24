<?php
/**
 * Nely's Salon Management System
 * Input Validator Helper
 */

class Validator {
    private array $errors = [];
    private array $data;

    public function __construct(array $data) {
        $this->data = $data;
    }

    public static function make(array $data, array $rules): self {
        $validator = new self($data);
        $validator->validate($rules);
        return $validator;
    }

    public function validate(array $rules): void {
        foreach ($rules as $field => $fieldRules) {
            $rulesList = is_string($fieldRules) ? explode('|', $fieldRules) : $fieldRules;
            $value = $this->data[$field] ?? null;

            foreach ($rulesList as $rule) {
                $param = null;
                if (str_contains($rule, ':')) {
                    [$rule, $param] = explode(':', $rule, 2);
                }

                switch ($rule) {
                    case 'required':
                        if ($value === null || $value === '' || (is_array($value) && empty($value))) {
                            $this->addError($field, "The {$field} field is required.");
                        }
                        break;

                    case 'email':
                        if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                            $this->addError($field, "The {$field} must be a valid email address.");
                        }
                        break;

                    case 'phone':
                        if ($value !== null && $value !== '' && !preg_match('/^(09|\+639)\d{9}$/', str_replace(' ', '', $value))) {
                            $this->addError($field, "The {$field} must be a valid Philippine mobile number (e.g. 0917 123 4567).");
                        }
                        break;

                    case 'min':
                        if ($value !== null && strlen((string)$value) < (int)$param) {
                            $this->addError($field, "The {$field} must be at least {$param} characters.");
                        }
                        break;

                    case 'max':
                        if ($value !== null && strlen((string)$value) > (int)$param) {
                            $this->addError($field, "The {$field} may not be greater than {$param} characters.");
                        }
                        break;

                    case 'numeric':
                        if ($value !== null && !is_numeric($value)) {
                            $this->addError($field, "The {$field} must be a valid number.");
                        }
                        break;

                    case 'in':
                        $allowed = explode(',', $param);
                        if ($value !== null && !in_array((string)$value, $allowed, true)) {
                            $this->addError($field, "The selected {$field} is invalid.");
                        }
                        break;

                    case 'date':
                        if ($value !== null && strtotime($value) === false) {
                            $this->addError($field, "The {$field} must be a valid date.");
                        }
                        break;
                }
            }
        }
    }

    private function addError(string $field, string $message): void {
        if (!isset($this->errors[$field])) {
            $this->errors[$field] = [];
        }
        $this->errors[$field][] = $message;
    }

    public function fails(): bool {
        return !empty($this->errors);
    }

    public function errors(): array {
        return $this->errors;
    }
}
