'use client';

// AÑADIDO: Se importa IconType para poder pasar un ícono como prop.
import { IconType } from "react-icons";

interface ToggleInputProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  // AÑADIDO: Prop opcional para el ícono.
  icon?: IconType;
}

const ToggleInput: React.FC<ToggleInputProps> = ({ 
  label, 
  value, 
  onChange, 
  // AÑADIDO: Se extrae el ícono de los props y se renombra a Icon.
  icon: Icon 
}) => {
  return (
    <div className="flex flex-row items-center justify-between p-4 border-[1px] border-neutral-200 rounded-lg">
      <div className="flex items-center gap-3">
        {/* AÑADIDO: Se renderiza el ícono si existe */}
        {Icon && <Icon size={24} className="text-neutral-600" />}
        <div className="font-semibold text-neutral-800">{label}</div>
      </div>
      <div 
        onClick={() => onChange(!value)}
        className={`
          relative 
          inline-block 
          w-12 
          h-7 
          cursor-pointer
          rounded-full
          transition-colors
          duration-300
          ${value ? 'bg-rose-500' : 'bg-neutral-300'}
        `}
      >
        <span 
          className={`
            absolute 
            left-1
            top-1
            w-5 
            h-5 
            bg-white 
            rounded-full 
            shadow-md 
            transform 
            transition-transform
            duration-300
            ${value ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </div>
    </div>
  );
}
 
export default ToggleInput;