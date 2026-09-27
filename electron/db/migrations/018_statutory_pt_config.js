module.exports = `
CREATE TABLE IF NOT EXISTS statutory_pt_config (
  id TEXT PRIMARY KEY,
  state_code TEXT NOT NULL,
  state_name TEXT NOT NULL,
  slabs_json TEXT NOT NULL, -- [{min,max,monthly_pt}]
  has_pt INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Seed all states
INSERT INTO statutory_pt_config (id,state_code,state_name,slabs_json,has_pt,notes,effective_from) VALUES
('pt-MH','MH','Maharashtra','[{"min":0,"max":7500,"monthly_pt":0},{"min":7501,"max":10000,"monthly_pt":175},{"min":10001,"max":null,"monthly_pt":200}]',1,'February: 300','2020-04-01'),
('pt-KA','KA','Karnataka','[{"min":0,"max":15000,"monthly_pt":0},{"min":15001,"max":null,"monthly_pt":200}]',1,'','2020-04-01'),
('pt-WB','WB','West Bengal','[{"min":0,"max":8500,"monthly_pt":0},{"min":8501,"max":10000,"monthly_pt":90},{"min":10001,"max":15000,"monthly_pt":110},{"min":15001,"max":25000,"monthly_pt":130},{"min":25001,"max":40000,"monthly_pt":150},{"min":40001,"max":null,"monthly_pt":200}]',1,'','2020-04-01'),
('pt-AP','AP','Andhra Pradesh','[{"min":0,"max":15000,"monthly_pt":0},{"min":15001,"max":20000,"monthly_pt":150},{"min":20001,"max":null,"monthly_pt":200}]',1,'','2020-04-01'),
('pt-TS','TS','Telangana','[{"min":0,"max":15000,"monthly_pt":0},{"min":15001,"max":20000,"monthly_pt":150},{"min":20001,"max":null,"monthly_pt":200}]',1,'','2020-04-01'),
('pt-GJ','GJ','Gujarat','[{"min":0,"max":5999,"monthly_pt":0},{"min":6000,"max":8999,"monthly_pt":80},{"min":9000,"max":11999,"monthly_pt":150},{"min":12000,"max":null,"monthly_pt":200}]',1,'','2020-04-01'),
('pt-TN','TN','Tamil Nadu','[{"min":0,"max":3500,"monthly_pt":0},{"min":3501,"max":5000,"monthly_pt":17},{"min":5001,"max":7500,"monthly_pt":25},{"min":7501,"max":10000,"monthly_pt":42},{"min":10001,"max":12500,"monthly_pt":58},{"min":12501,"max":null,"monthly_pt":83}]',1,'Semi-annual','2020-04-01'),
('pt-KL','KL','Kerala','[{"min":0,"max":1999,"monthly_pt":0},{"min":2000,"max":2999,"monthly_pt":20},{"min":3000,"max":4999,"monthly_pt":30},{"min":5000,"max":7499,"monthly_pt":50},{"min":7500,"max":9999,"monthly_pt":75},{"min":10000,"max":12499,"monthly_pt":100},{"min":12500,"max":16666,"monthly_pt":125},{"min":16667,"max":20833,"monthly_pt":166},{"min":20834,"max":null,"monthly_pt":208}]',1,'','2020-04-01'),
('pt-MP','MP','Madhya Pradesh','[{"min":0,"max":18750,"monthly_pt":0},{"min":18751,"max":null,"monthly_pt":208}]',1,'Quarterly','2020-04-01'),
('pt-DL','DL','Delhi','[]',0,'No PT','2020-04-01'),
('pt-UP','UP','Uttar Pradesh','[]',0,'No PT','2020-04-01'),
('pt-RJ','RJ','Rajasthan','[]',0,'No PT','2020-04-01'),
('pt-HR','HR','Haryana','[]',0,'No PT','2020-04-01');
`;
