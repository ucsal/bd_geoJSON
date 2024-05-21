CREATE TABLE "json" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "columns" integer,
  "rows" integer,
  "type" integer,
  "normalized" boolean DEFAULT false,
  "created_at" timestamp
);

CREATE TABLE "keys" (
  "id" uuid PRIMARY KEY,
  "json_id" uuid,
  "key_id" uuid,
  "name" varchar,
  "nullable" boolean,
  "type" varchar
);

CREATE TABLE "value" (
  "keys_id" uuid,
  "rows_id" uuid,
  "value" varchar
);

CREATE TABLE "rows" (
  "id" uuid PRIMARY KEY,
  "position" varchar
);

ALTER TABLE "keys" ADD FOREIGN KEY ("json_id") REFERENCES "json" ("id");

ALTER TABLE "keys" ADD FOREIGN KEY ("key_id") REFERENCES "keys" ("id");

ALTER TABLE "value" ADD FOREIGN KEY ("keys_id") REFERENCES "keys" ("id");

ALTER TABLE "value" ADD FOREIGN KEY ("rows_id") REFERENCES "rows" ("id");
