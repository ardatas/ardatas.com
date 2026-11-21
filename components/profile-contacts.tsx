import ContactCards, { type ContributionDay } from "@/components/ui/contact-cards";

export default function ProfileContacts({ days }: { days: ContributionDay[] }) {
  const portrait = "/assets/arda-portrait.jpg.webp";
  return (
    <ContactCards
      email="arda@ardatas.com"
      locale="en-US"
      github={{
        username: "ardatas",
        days,
        avatar: <img src={portrait} alt="" className="size-10 rounded-full object-cover" />,
      }}
      links={[{
        label: "LinkedIn",
        href: "https://linkedin.com/in/arda-tas",
        icon: <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6"><use href="/assets/hugeicons.svg#linkedin-01" /></svg>,
        card: (
          <div className="w-[min(18rem,calc(100vw-2rem))]">
            <div className="h-16 bg-gradient-to-br from-[#0a66c2] to-[#a2cbe9]" />
            <div className="flex flex-col gap-1 px-4 pb-4">
              <img src={portrait} alt="" className="-mt-7 mb-1 size-14 rounded-full object-cover ring-4 ring-white" />
              <strong>Arda Taş</strong>
              <span className="text-sm text-zinc-500">Computer science at TUM · Munich</span>
            </div>
          </div>
        ),
      }]}
    />
  );
}
