"use client";

// No se necesita importar 'useState' ni el ícono 'IoMdClose'

interface InfoPopupProps {
  message: string;
}

const InfoPopup: React.FC<InfoPopupProps> = ({ message }) => {
  // Se ha eliminado el estado 'isVisible' y la condición,
  // por lo que este componente ahora siempre se renderizará.

  return (
    <div className="
      absolute 
      bottom-1 
      right-1 
      bg-white 
      px-3 
      py-2 
      rounded-lg 
      shadow-lg 
      z-[1000] 
      flex 
      items-center 
      gap-2 
      text-sm 
      w-[290px]"
    >
      <span className='text-neutral-700 flex-grow'>{message}</span>
      
      {/* ✅ El botón con la 'X' ha sido completamente eliminado. */}
    </div>
  );
};

export default InfoPopup;