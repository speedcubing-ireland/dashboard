import type { GoogleUser } from "@/types/gsuite";
import { adminRequest, fetchAll } from "./client";

interface UserListResponse {
  users: GoogleUser[];
  nextPageToken?: string;
}

export const getAllUsers = (accessToken: string) =>
  fetchAll<GoogleUser>(
    (token, params) =>
      adminRequest<UserListResponse>("/users", token, {
        params: { ...params, orderBy: "email" },
      }).then((r) => ({ items: r.users, nextPageToken: r.nextPageToken })),
    accessToken,
    { customer: "my_customer", maxResults: 200 },
  );
