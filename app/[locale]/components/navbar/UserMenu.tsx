'use client';

import { AiOutlineMenu } from "react-icons/ai";
import Avatar from "../Avatar";
import { useCallback, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

import useLoginModal from "@/app/hooks/useLoginModal";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import useRentModal from "@/app/hooks/useRentModal";

import MenuItem from "./MenuItem";
import { SafeUser } from "@/app/types";

interface UserMenuProps {
  currentUser?: SafeUser | null
}

const UserMenu: React.FC<UserMenuProps> = ({
  currentUser
}) => {
  const router = useRouter();

  const loginModal = useLoginModal();
  const registerModal = useRegisterModal();
  const rentModal = useRentModal();

  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = useCallback(() => {
    setIsOpen((value) => !value);
  }, []);

  // --- ESTA ES LA FUNCIÓN MODIFICADA ---
  const onRent = useCallback(() => {
    // Se elimina la comprobación de 'currentUser'.
    // Ahora, siempre se abrirá el RentModal directamente.
    setIsOpen(false); // Cierra el menú si está abierto
    rentModal.onOpen();
  }, [rentModal]); // Se quitan las dependencias innecesarias

  return ( 
    <div className="relative">
      <div className="flex flex-row items-center gap-3">
        <div 
          onClick={onRent} // La acción es la misma
          className="
            hidden
            md:block
            text-sm 
            font-semibold 
            py-3 
            px-4 
            rounded-full 
            hover:bg-neutral-100 
            transition 
            cursor-pointer
          "
        >
          Publica tu espacio
        </div>
        <div 
        onClick={toggleOpen}
        className="
          p-4
          md:py-1
          md:px-2
          border-[1px] 
          border-neutral-200 
          flex 
          flex-row 
          items-center 
          gap-3 
          rounded-full 
          cursor-pointer 
          hover:shadow-md 
          transition
          "
        >
          <AiOutlineMenu />
          <div className="hidden md:block">
            <Avatar src={currentUser?.image} />
          </div>
        </div>
      </div>
      {isOpen && (
        <div 
          className="
            absolute 
            rounded-xl 
            shadow-md
            w-[40vw]
            md:w-3/4 
            bg-white 
            overflow-hidden 
            right-0 
            top-12 
            text-sm
          "
        >
          <div className="flex flex-col cursor-pointer">
            {currentUser ? (
              <>
                <MenuItem 
                  label="Mis viajes" 
                  onClick={() => router.push('/trips')}
                />
                <MenuItem 
                  label="Mis favoritos" 
                  onClick={() => router.push('/favorites')}
                />
                <MenuItem 
                  label="Mis reservaciones" 
                  onClick={() => router.push('/reservations')}
                />
                <MenuItem 
                  label="Mis propiedades" 
                  onClick={() => router.push('/properties')}
                />
                {/* El botón dentro del menú también usa la nueva lógica */}
                <MenuItem 
                  label="Publica tu espacio" 
                  onClick={onRent}
                />
                <hr />
                <MenuItem 
                  label="Cerrar sesión" 
                  onClick={() => signOut()}
                />
              </>
            ) : (
              <>
                <MenuItem 
                  label="Iniciar sesión" 
                  onClick={loginModal.onOpen}
                />
                <MenuItem 
                  label="Registrarse" 
                  onClick={registerModal.onOpen}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
   );
}
 
export default UserMenu;