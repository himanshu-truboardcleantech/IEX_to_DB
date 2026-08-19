CREATE TABLE IF NOT EXISTS iex_dsm (
    id                  BIGSERIAL PRIMARY KEY,
    state               TEXT        NOT NULL,
    delivery_date       DATE        NOT NULL,
    time_period         TEXT        NOT NULL,
    dam_cleared_buy_mw  NUMERIC,
    dam_cleared_sell_mw NUMERIC,
    dam_price_rs_mwh    NUMERIC,
    dam_trade_mw        NUMERIC,
    gdam_cleared_buy_mw NUMERIC,
    gdam_cleared_sell_mw NUMERIC,
    gdam_price_rs_mwh   NUMERIC,
    gdam_trade_mw       NUMERIC,
    rtm_cleared_buy_mw  NUMERIC,
    rtm_cleared_sell_mw NUMERIC,
    rtm_price_rs_mwh    NUMERIC,
    rtm_trade_mw        NUMERIC,
    wt_avg_acp_dam      NUMERIC,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT iex_dsm_state_date_period_key UNIQUE (state, delivery_date, time_period)
);

CREATE INDEX IF NOT EXISTS idx_iex_dsm_state_date ON iex_dsm (state, delivery_date);
