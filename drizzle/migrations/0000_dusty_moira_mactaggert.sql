CREATE TABLE "analyst_coverage" (
	"id" serial PRIMARY KEY NOT NULL,
	"analyst_id" integer NOT NULL,
	"stock_id" integer NOT NULL,
	"hit_ratio" numeric(8, 4),
	"avg_return" numeric(8, 4),
	"avg_days" integer,
	"total_calls" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "analyst_coverage_analyst_stock_unique" UNIQUE("analyst_id","stock_id")
);
--> statement-breakpoint
CREATE TABLE "analyst_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"analyst_id" integer NOT NULL,
	"stock_id" integer NOT NULL,
	"target_price" numeric(12, 4) NOT NULL,
	"rating" varchar(20),
	"issued_date" date NOT NULL,
	"report_source" varchar(255),
	"notes" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysts" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" integer,
	"name" varchar(255) NOT NULL,
	"initials" varchar(10),
	"firm" varchar(255),
	"since_year" integer,
	"hit_ratio" numeric(8, 4),
	"avg_return" numeric(8, 4),
	"avg_days" integer,
	"perf_score" numeric(8, 4),
	"total_targets" integer DEFAULT 0 NOT NULL,
	"bio" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "analysts_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "ingestion_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_at" timestamp DEFAULT now() NOT NULL,
	"source" varchar(100) NOT NULL,
	"stocks_updated" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "signal_snapshot_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"stock_id" integer NOT NULL,
	"entry_price" numeric(12, 4) NOT NULL,
	"score_at_signal" integer,
	"note" text,
	"rank" integer,
	CONSTRAINT "signal_snapshot_entries_snap_stock_unique" UNIQUE("snapshot_id","stock_id")
);
--> statement-breakpoint
CREATE TABLE "signal_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" varchar(7) NOT NULL,
	"label" varchar(20) NOT NULL,
	"nase_ret" numeric(8, 4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "signal_snapshots_month_unique" UNIQUE("month")
);
--> statement-breakpoint
CREATE TABLE "stock_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_id" integer NOT NULL,
	"date" date NOT NULL,
	"open" numeric(12, 4),
	"high" numeric(12, 4),
	"low" numeric(12, 4),
	"close" numeric(12, 4) NOT NULL,
	"volume" bigint,
	"change_pct" numeric(8, 4),
	"high_52w" numeric(12, 4),
	"low_52w" numeric(12, 4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_prices_stock_date_unique" UNIQUE("stock_id","date")
);
--> statement-breakpoint
CREATE TABLE "stock_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_id" integer NOT NULL,
	"score" integer NOT NULL,
	"signal" varchar(50),
	"sig_class" varchar(10),
	"confidence" varchar(10),
	"upside_pct" numeric(8, 4),
	"pillar_confidence" integer,
	"pillar_accuracy" integer,
	"pillar_upside" integer,
	"pillar_momentum" integer,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_scores_stock_id_unique" UNIQUE("stock_id")
);
--> statement-breakpoint
CREATE TABLE "stocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	"sector" varchar(100),
	"profile" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stocks_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE TABLE "watchlist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255),
	"stock_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_items_user_stock_unique" UNIQUE("user_id","stock_id")
);
--> statement-breakpoint
ALTER TABLE "analyst_coverage" ADD CONSTRAINT "analyst_coverage_analyst_id_analysts_id_fk" FOREIGN KEY ("analyst_id") REFERENCES "public"."analysts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyst_coverage" ADD CONSTRAINT "analyst_coverage_stock_id_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyst_targets" ADD CONSTRAINT "analyst_targets_analyst_id_analysts_id_fk" FOREIGN KEY ("analyst_id") REFERENCES "public"."analysts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyst_targets" ADD CONSTRAINT "analyst_targets_stock_id_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_snapshot_entries" ADD CONSTRAINT "signal_snapshot_entries_snapshot_id_signal_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."signal_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_snapshot_entries" ADD CONSTRAINT "signal_snapshot_entries_stock_id_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_prices" ADD CONSTRAINT "stock_prices_stock_id_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_scores" ADD CONSTRAINT "stock_scores_stock_id_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_stock_id_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analyst_coverage_stock_idx" ON "analyst_coverage" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "analyst_targets_stock_current_idx" ON "analyst_targets" USING btree ("stock_id","is_current");--> statement-breakpoint
CREATE INDEX "analyst_targets_analyst_idx" ON "analyst_targets" USING btree ("analyst_id");--> statement-breakpoint
CREATE INDEX "analysts_firm_idx" ON "analysts" USING btree ("firm");--> statement-breakpoint
CREATE INDEX "ingestion_log_run_at_idx" ON "ingestion_log" USING btree ("run_at");--> statement-breakpoint
CREATE INDEX "signal_snapshot_entries_snap_idx" ON "signal_snapshot_entries" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "stock_prices_stock_date_idx" ON "stock_prices" USING btree ("stock_id","date");--> statement-breakpoint
CREATE INDEX "stock_scores_sig_class_idx" ON "stock_scores" USING btree ("sig_class");--> statement-breakpoint
CREATE INDEX "stocks_active_idx" ON "stocks" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "stocks_sector_idx" ON "stocks" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "watchlist_items_user_idx" ON "watchlist_items" USING btree ("user_id");