import { redirect } from "next/navigation";

export default function SeasonRedirect({
  params,
}: {
  params: { imdbId: string; season: string };
}) {
  redirect(
    `/watch/${params.imdbId.toLowerCase()}?type=series&season=${params.season}&episode=1`
  );
}
