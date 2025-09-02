import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Make sure this path is correct

export async function POST(request: Request) {
  const body = await request.json();
  const { title, description, imageSrc, category, roomCount, bathroomCount, guestCount, locationValue, price, userId, includesWater, includesElectricity, allowsChildren, allowsPets, petSize, monthlyCost, includesInternet } = body;

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        imageSrc,
        category,
        roomCount,
        bathroomCount,
        guestCount,
        locationValue,
        price,
        userId,
        includesWater,
        includesElectricity,
        allowsChildren,
        allowsPets,
        petSize,
        monthlyCost,
        includesInternet,
      },
    });
    return NextResponse.json(listing);
  } catch (error) {
    console.error(error);
    return new NextResponse('Something went wrong', { status: 500 });
  }
}