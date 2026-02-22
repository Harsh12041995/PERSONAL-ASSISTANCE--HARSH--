import React from "react";

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
  placeholder?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  children,
  placeholder = "Select...",
  className = "",
  disabled = false,
}) => {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 appearance-none bg-white"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
};

const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  className = "",
  placeholder,
}) => {
  return <div className={`relative ${className}`}>{children}</div>;
};

const SelectContent: React.FC<SelectContentProps> = ({
  children,
  className = "",
}) => {
  return <div className={className}>{children}</div>;
};

const SelectItem: React.FC<SelectItemProps> = ({
  value,
  children,
  className = "",
}) => {
  return (
    <option value={value} className={className}>
      {children}
    </option>
  );
};

const SelectValue: React.FC<SelectValueProps> = ({
  placeholder,
  className = "",
}) => {
  return <span className={className}>{placeholder}</span>;
};

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
