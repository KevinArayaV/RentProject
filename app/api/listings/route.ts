import { NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';

export async function POST(
  request: Request, 
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const body = await request.json();
  const { 
    title,
    description,
    imageSrc,
    category,
    roomCount,
    bathroomCount,
    guestCount,
    location, // El objeto de ubicación de Leaflet
    price,
    // ✅ 1. Añadimos TODOS los nuevos campos del formulario
    province,
    address,
    garageCount,
    monthlyCost,
    includesWater,
    includesElectricity,
    includesInternet,
    allowsChildren,
    allowsPets,
    contactPhone,
    contactWhatsapp,
   } = body;

   // Asegurémonos de que el precio se guarde como un número
   const numericMonthlyCost = parseInt(monthlyCost, 10);

  const listing = await prisma.listing.create({
    data: {
      title,
      description,
      imageSrc,
      category,
      roomCount,
      bathroomCount,
      guestCount,
      locationValue: location.value, // Asumiendo que location es un objeto con una propiedad 'value'
      price: numericMonthlyCost, // Usamos el precio mensual como el precio principal
      userId: currentUser.id,
      // ✅ 2. Guardamos los nuevos campos en la base de datos
      province,
      address,
      garageCount,
      monthlyCost: numericMonthlyCost,
      includesWater,
      includesElectricity,
      includesInternet,
      allowsChildren,
      allowsPets,
      contactPhone,
      contactWhatsapp,
    }
  });

  return NextResponse.json(listing);
}