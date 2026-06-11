import urllib.request
import json

queries = [
    "информационные системы управления предприятием",
    "Agile Scrum разработка программного обеспечения",
    "микросервисная архитектура",
    "базы данных PostgreSQL",
    "React разработка веб-приложений",
    "геймификация в управлении персоналом",
    "Time management управление временем",
    "FastAPI Python разработка"
]

results = []

for q in queries:
    url = f"https://api.crossref.org/works?query={urllib.parse.quote(q)}&select=DOI,title,author,issued,container-title&rows=5"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'DiplomBuilder/1.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            for item in data['message']['items']:
                title = item.get('title', [''])[0]
                doi = item.get('DOI', '')
                authors = item.get('author', [])
                author_str = ""
                if authors:
                    first = authors[0]
                    family = first.get('family', '')
                    given = first.get('given', '')
                    author_str = f"{family} {given}"
                
                container = item.get('container-title', [''])[0]
                
                # Check if it has cyrillic to ensure it's a Russian article
                if any('\u0400' <= c <= '\u04FF' for c in title):
                    results.append(f"{author_str}. {title} // {container}. DOI: {doi}")
    except Exception as e:
        print(f"Error on {q}: {e}")

with open("real_sources.txt", "w", encoding="utf-8") as f:
    for r in results:
        f.write(r + "\n")
print(f"Found {len(results)} sources.")
