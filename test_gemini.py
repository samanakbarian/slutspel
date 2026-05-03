import json
import logging
from google import genai
from google.genai import types

logging.basicConfig(level=logging.INFO)

def analyze_with_gemini(text, article_type):
    try:
        client = genai.Client()
        if article_type == "RYKTE":
            prompt = f"""Du är en strikt data-analytiker. Läs detta hockeyrykte.
1. Finns det ett tydligt sentiment (0-100)? Om inte, returnera null.
2. Finns det uttalade fördelar/nackdelar i texten? Om inte, returnera null för fälten.
Du får ALDRIG hitta på information.
Returnera enbart JSON: {{"sentiment_pct": number|null, "pros": string[]|null, "cons": string[]|null}}

Text: {text}"""
        else:
            prompt = f"""Du är en strikt data-analytiker. Läs denna officiella nyhet.
Kan du utläsa om en spelare lämnar eller ansluter? Om ja, finns det historisk data i texten kring istid (minuter) eller poäng?
Om inte, estimera ALDRIG. Svara enbart med fakta från texten.
Returnera enbart JSON: {{"impact_points": number|null, "impact_toi": string|null, "type": "positive"|"negative"|null}}

Text: {text}"""

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            )
        )
        return json.loads(response.text)
    except Exception as e:
        logging.error(f"Gemini error: {e}")
        return None

if __name__ == "__main__":
    text = "Björklöven har idag skrivit ett 2-årskontrakt med stjärncentern Lucas Wallmark. 'Han kommer bidra med mycket istid, snittade 18 minuter per match ifjol och gjorde 45 poäng', säger sportchefen."
    print("Testar OFFICIELL nyhet...")
    print(analyze_with_gemini(text, "OFFICIELL"))

    text_rykte = "Jag hörde från en väldigt säker källa att Wallmark är helt klar för Löven. Alla fans jublar, detta är årets värvning! Han är dock väldigt dyr i drift."
    print("\nTestar RYKTE...")
    print(analyze_with_gemini(text_rykte, "RYKTE"))
