'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import qs from 'query-string';

import { SafeUser } from "@/app/types";

import Container from "../Container";
import Logo from "./Logo";
import Search from "./Search";
import UserMenu from "./UserMenu";
import CategoryBox from './CategoryBox';

// ✅ LA SOLUCIÓN: Se ha añadido 'FaVolcano' a la importación estándar y se ha eliminado la línea incorrecta.
import { FaCity, FaChurch, FaUmbrellaBeach, FaAnchor, FaLeaf, FaMountain } from 'react-icons/fa';

import { IoFlowerOutline } from 'react-icons/io5';

// Creamos la lista de provincias con sus íconos
export const provinces = [
  { label: 'San José', icon: FaCity },
  { label: 'Alajuela', icon: FaMountain },
  { label: 'Heredia', icon: IoFlowerOutline },
  { label: 'Cartago', icon: FaChurch },
  { label: 'Guanacaste', icon: FaUmbrellaBeach },
  { label: 'Puntarenas', icon: FaAnchor },
  { label: 'Limón', icon: FaLeaf }
];

interface NavbarProps {
  currentUser?: SafeUser | null;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const category = params?.get('category');

  const handleSelectCategory = useCallback((label: string) => {
    let currentQuery = {};
    if (params) {
      currentQuery = qs.parse(params.toString());
    }
    const updatedQuery: any = { ...currentQuery, category: label };
    if (params?.get('category') === label) {
      delete updatedQuery.category;
    }
    const url = qs.stringifyUrl({ url: '/', query: updatedQuery }, { skipNull: true });
    router.push(url);
  }, [params, router]);

  const isMainPage = pathname === '/';

  return (
    <div className="fixed w-full bg-white z-10 shadow-sm">
      <div className="py-4 border-b-[1px]">
        <Container>
          <div className="flex flex-row items-center justify-between gap-3 md:gap-0">
            <Logo />
            <Search />
            <UserMenu currentUser={currentUser} />
          </div>
        </Container>
      </div>
      
      {isMainPage && (
        <Container>
          <div className="pt-4 flex flex-row items-center justify-between overflow-x-auto">
            {provinces.map((item) => (
              <CategoryBox 
                key={item.label}
                label={item.label}
                icon={item.icon}
                onClick={() => handleSelectCategory(item.label)}
                selected={category === item.label}
              />
            ))}
          </div>
        </Container>
      )}
    </div>
  );
}

export default Navbar;