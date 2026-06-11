import urllib.request

dois = [
    "10.36535/0548-0027-2021-05-3",
    "10.18411/spc-16-01-2018-10",
    "10.36627/2304-6473-2021-3-3-220-234",
    "10.18411/lj2016-5-2-09",
    "10.18334/ide.1.4.113371",
    "10.15216/978-5406017647",
    "10.7256/2305-6061.2013.01.2",
    "10.17513/msnv.21213",
    "10.51623/23132027_121_167",
    "10.34755/irok.2020.96.87.099",
    "10.12737/textbook_592bf050240c25.05222932",
    "10.36627/2619-144x-2023-3-3-170-178",
    "10.36627/2618-8864-2022-1-1-2-8",
    "10.58224/2618-7175-2024-12-324-331",
    "10.36627/2618-8864-2021-3-3-220-224",
    "10.54251/2616-6429.2025.04.0015nu"
]

for doi in dois:
    url = f"https://doi.org/{doi}"
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req) as response:
            print(f"{doi} - Status: {response.status}")
    except urllib.error.HTTPError as e:
        print(f"{doi} - HTTP Error: {e.code}")
    except Exception as e:
        print(f"{doi} - Error: {e}")
