import { api } from "../api";
import { useDayflow } from "./store";

export async function syncFromApi() {
  const data = await api.get<Parameters<ReturnType<typeof useDayflow.getState>["hydrateFromApi"]>[0]>(
    "/api/sync"
  );
  useDayflow.getState().hydrateFromApi(data);
}
