'use client';

interface SegmentedControlProps {
  name: string;
  options: { label: string; value: string }[];
  selectedValue: string;
  onChange: (value: string) => void;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  name,
  options,
  selectedValue,
  onChange
}) => {
  return (
    <div className="w-full flex p-1 bg-neutral-200 rounded-lg">
      {options.map((option) => (
        <button
          key={option.value}
          type="button" // Importante para que no envíe el formulario
          onClick={() => onChange(option.value)}
          className={`
            flex-1
            p-2
            text-center
            text-sm
            font-semibold
            rounded-md
            transition-all
            duration-300
            focus:outline-none
            ${selectedValue === option.value 
              ? 'bg-white text-black shadow-md' 
              : 'bg-transparent text-neutral-600'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;