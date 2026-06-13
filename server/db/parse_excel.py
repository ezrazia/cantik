import pandas as pd
import json
import os

excel_path = r"C:\Users\Ezra\Downloads\65.xlsx"
json_output_path = os.path.join(os.path.dirname(__file__), "wilayah_data.json")

# Read excel
df = pd.read_excel(excel_path, sheet_name="Sheet2")

# Format columns with zero padding
df['kdprov'] = df['kdprov'].astype(str).str.zfill(2)
df['kdkab'] = df['kdkab'].astype(str).str.zfill(2)
df['kdkec'] = df['kdkec'].astype(str).str.zfill(3)
df['kddesa'] = df['kddesa'].astype(str).str.zfill(3)
df['kdsls'] = df['kdsls'].astype(str).str.zfill(4)
df['kdsubsls'] = df['kdsubsls'].astype(str).str.zfill(2)
df['kode_wilayah'] = df['idsubsls_25_2'].astype(str)

# Rename column names
data = []
for _, row in df.iterrows():
    item = {
        "kecamatan": str(row["nmkec"]).strip(),
        "desa": str(row["nmdesa"]).strip(),
        "sls": str(row["nmsls"]).strip() if pd.notna(row["nmsls"]) else None,
        "sub_sls": str(row["nmsubsls"]).strip() if pd.notna(row["nmsubsls"]) else None,
        "kode_wilayah": row["kode_wilayah"],
        "kdprov": row["kdprov"],
        "kdkab": row["kdkab"],
        "kdkec": row["kdkec"],
        "kddesa": row["kddesa"],
        "kdsls": row["kdsls"],
        "kdsubsls": row["kdsubsls"]
    }
    data.append(item)

# Save to JSON file
with open(json_output_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(data)} region rows successfully to {json_output_path}")
