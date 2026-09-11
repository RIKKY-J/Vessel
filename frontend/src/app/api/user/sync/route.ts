import { NextRequest, NextResponse } from "next/server";
import { syncUserInS3 } from "@/lib/aws";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, avatar } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    console.log(`[API /user/sync] Registering / updating user in S3: ${email}`);
    const user = await syncUserInS3({
      email,
      name: name || email.split("@")[0],
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
    });

    // 12-hour expiration window
    const expiresAt = Date.now() + 12 * 60 * 60 * 1000;

    return NextResponse.json(
      {
        message: "User synchronized successfully in S3",
        user,
        expiresAt,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error syncing user in S3:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to synchronize user in S3" },
      { status: 500 }
    );
  }
}
