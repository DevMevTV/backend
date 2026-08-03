CREATE TABLE "worlds" (
	"uuid" uuid PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"token" varchar NOT NULL,
	"verified" boolean DEFAULT false NOT NULL
);
