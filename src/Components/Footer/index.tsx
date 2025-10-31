import Link from "next/link";

type FooterProps = { showCredit?: boolean };

export default function Footer({ showCredit = true }: FooterProps) {
  return (
    <footer className=" w-full gap-10 text-center">
  <section className="mt-5">
        <Link href="/privacy">
          <a className="underline">Privacy Policy</a>
        </Link>
        {` - `}
        <Link href="/terms">
          <a className="underline">Terms and condition</a>
        </Link>
      </section>
    </footer>
  );
}

