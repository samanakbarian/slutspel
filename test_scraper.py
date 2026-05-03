import sys
import os
sys.path.append("c:\\Users\\saman\\loven-stats-backend\\functions")

try:
    from silly_scraper import analyze_with_gemini

    text = "Björklöven har idag skrivit ett 2-årskontrakt med stjärncentern Lucas Wallmark. 'Han kommer bidra med mycket istid, snittade 18 minuter per match ifjol och gjorde 45 poäng', säger sportchefen."
    
    print("Testar OFFICIELL nyhet...")
    res = analyze_with_gemini(text, "OFFICIELL")
    print(res)

    text_rykte = "Jag hörde från en väldigt säker källa att Wallmark är helt klar för Löven. Alla fans jublar, detta är årets värvning! Han är dock väldigt dyr i drift."
    print("\nTestar RYKTE...")
    res_rykte = analyze_with_gemini(text_rykte, "RYKTE")
    print(res_rykte)

except Exception as e:
    print(f"Error: {e}")
