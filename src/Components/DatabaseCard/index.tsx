import Link from "next/link";
import React from "react";

type DatabaseCardProps = {
  title: string;
  description: string;
  databasehref: string;
  pomodorohref: string;
};

const DatabaseCard = ({
  title,
  description,
  databasehref,
  pomodorohref,
}: DatabaseCardProps) => {
  return (
    <Link href={pomodorohref}>
      <section className="flex cursor-pointer flex-col justify-center rounded-md border-2 border-gray-500 p-6 shadow-xl duration-500 motion-safe:hover:scale-105">
        <h2 className="text-lg text-gray-700">{title}</h2>
        <p className="text-sm text-gray-600">{description}</p>
        <Link href={pomodorohref}>
          <button className="mt-5 rounded-md bg-gray-600 py-2 px-4 text-gray-200 hover:bg-gray-700">
            Pomodoro
          </button>
        </Link>
      </section>
    </Link>
  );
};

export default DatabaseCard;