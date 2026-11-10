"""Gera uma página HTML única com a documentação da Central Educacional.

Uso (na raiz do repo): python3 -I docs/html/gerar_doc.py . /tmp/documentacao-central.html
Lê CLAUDE.md e docs/*.md; blocos ```mermaid viram <pre class="mermaid"> (o Artifact desenha).
"""

import base64
import json
import html
import re
import sys
import unicodedata
from pathlib import Path

raiz = Path(sys.argv[1])
saida = Path(sys.argv[2])

DOCS = [
    ("especificacao", "Especificação", "CLAUDE.md"),
    ("modulos", "Modularização", "docs/modulos.md"),
    ("funcionalidades", "Funcionalidades", "docs/funcionalidades.md"),
    ("diagramas", "Diagramas", "docs/diagramas.md"),
    ("design-system", "Design system", "docs/design-system.md"),
    ("desenvolvimento", "Desenvolvimento", "docs/desenvolvimento.md"),
]
DS = raiz / "docs/design-system"
COMPONENTES = ["Botao", "SeloSituacao", "SeloSincronia", "Campo", "EscalaOpcoes", "Aviso", "Progresso", "CartaoTurma"]
ARQ_PARA_DOC = {Path(a).name: k for k, _, a in DOCS}


def slug(txt: str) -> str:
    t = unicodedata.normalize("NFKD", txt).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[^a-z0-9 -]", "", t).strip()
    return re.sub(r"[ ]+", "-", t)


def inline(txt: str, doc: str) -> str:
    partes = re.split(r"(`[^`]+`)", txt)
    out = []
    for p in partes:
        if p.startswith("`") and p.endswith("`") and len(p) > 1:
            out.append(f"<code>{html.escape(p[1:-1])}</code>")
            continue
        p = html.escape(p, quote=False)

        def link(m):
            texto, alvo = m.group(1), m.group(2)
            if alvo.startswith("http"):
                return f'<a href="{alvo}" target="_blank" rel="noopener">{texto}</a>'
            arq, _, ancora = alvo.partition("#")
            destino = ARQ_PARA_DOC.get(Path(arq).name, doc) if arq else doc
            return f'<a href="#{destino}{"-" + slug(ancora) if ancora else ""}">{texto}</a>'

        p = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link, p)
        p = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", p)
        p = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"<em>\1</em>", p)
        p = p.replace("✔", '<span class="ok" aria-label="sim">✔</span>')
        out.append(p)
    return "".join(out)


def celulas(linha: str) -> list[str]:
    linha = linha.strip()
    if linha.startswith("|"):
        linha = linha[1:]
    if linha.endswith("|"):
        linha = linha[:-1]
    # "\|" dentro de código não separa coluna
    return [c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", linha)]


def resumo(comp: str) -> str:
    texto = (DS / "components" / comp / "README.md").read_text(encoding="utf-8")
    corpo = [l for l in texto.split("\n") if l.strip() and not l.startswith("#")]
    primeira = corpo[0] if corpo else ""
    return re.split(r"(?<=[.:])\s", primeira, maxsplit=1)[0]


def vitrine() -> str:
    tok = json.loads((DS / "tokens.json").read_text(encoding="utf-8"))
    cores = "".join(
        f'<div class="v-cor"><span class="v-amostra" style="background:var(--{t['name']})"></span>'
        f'<code>{t['name']}</code><small>{html.escape(t.get('usage', ''))}</small></div>'
        for t in tok["color"]["tokens"]
    )
    estilos = ""
    for g in tok["type"]["groups"]:
        for st in g["styles"]:
            fam = st.get("family", g["family"])
            css = (
                f"font-family:var(--font-{fam});font-size:{st['fontSize']};"
                f"line-height:{st['lineHeight']};font-weight:{st['fontWeight']}"
            )
            if st.get("letterSpacing"):
                css += f";letter-spacing:{st['letterSpacing']}"
            estilos += (
                f'<div class="v-tipo"><div class="v-tipo-meta"><code>{st['name']}</code>'
                f'<small>{fam} · {st['fontSize']}/{st['lineHeight']} · {st['fontWeight']}</small></div>'
                f'<div style="{css}">{html.escape(st.get('sample', st['name']))}</div></div>'
            )
    medidas = "".join(
        f'<div class="v-medida"><code>{t['name']}</code><span class="v-barra" style="width:{t['value']}"></span><small>{t['value']}</small></div>'
        for t in tok["spacing"]["tokens"]
    ) + "".join(
        f'<div class="v-medida"><code>{t['name']}</code><span class="v-raio" style="border-radius:var(--{t['name']})"></span><small>{t['value']}</small></div>'
        for t in tok["radius"]["tokens"]
    )
    comps = "".join(
        f'<div class="v-comp"><div class="v-comp-cab"><h4>{c}</h4><p>{inline(resumo(c), "design-system")}</p></div>'
        f'<div class="v-demo" id="v-{c}"></div></div>'
        for c in COMPONENTES
    )
    return f"""<div class="vitrine">
<div class="v-barra-topo"><strong>Vitrine ao vivo</strong><span>Componentes de <code>docs/design-system/components</code>, os mesmos do artifact.</span><button type="button" id="v-tema" class="ce-botao ce-botao-secundario">Ver tema escuro</button></div>
<h4 class="v-titulo">Paleta</h4><div class="v-cores">{cores}</div>
<h4 class="v-titulo">Tipografia</h4><div class="v-tipos">{estilos}</div>
<h4 class="v-titulo">Espaço e raio</h4><div class="v-medidas">{medidas}</div>
<h4 class="v-titulo">Componentes</h4><div class="v-comps">{comps}</div>
<h4 class="v-titulo">Composição: a ficha no celular</h4>
<p class="v-nota">Os componentes juntos numa ficha devolvida pela coordenação. Interativa: marque as opções.</p>
<div class="v-demo v-demo-celular" id="v-Composicao"></div>
</div>"""


def css_tokens() -> str:
    tok = json.loads((DS / "tokens.json").read_text(encoding="utf-8"))
    claro, escuro = [], []
    for t in tok["color"]["tokens"]:
        v = t["value"]
        claro.append(f"--{t['name']}:{v['claro'] if isinstance(v, dict) else v}")
        if isinstance(v, dict) and "escuro" in v:
            escuro.append(f"--{t['name']}:{v['escuro']}")
    outros = [f"--{t['name']}:{t['value']}" for fam in ("spacing", "radius", "tamanho") for t in tok[fam]["tokens"]]
    sombra = tok["shadow"]["tokens"][0]
    claro.append(f"--{sombra['name']}:{sombra['value']['claro']}")
    escuro.append(f"--{sombra['name']}:{sombra['value']['escuro']}")
    e = ";".join(escuro) + ";color-scheme:dark"
    return (
        f":root{{{';'.join(claro + outros)}}}"
        f"@media (prefers-color-scheme: dark){{:root:not([data-theme=\"light\"]){{{e}}}}}"
        f":root[data-theme=\"dark\"]{{{e}}}"
    )


def css_componentes() -> str:
    css = (DS / "components/bundle.css").read_text(encoding="utf-8")
    css = re.sub(r"@import url\([^)]*\);", "", css)
    return re.sub(r"\nbody \{[^}]*\}", "", css)


def converter(md: str, doc: str, titulos: list):
    linhas = md.split("\n")
    out = []
    i = 0
    primeiro_h1 = True
    while i < len(linhas):
        ln = linhas[i]
        if ln.strip() == "<!-- vitrine -->":
            out.append(vitrine())
            i += 1
            continue
        if ln.startswith("```"):
            lang = ln[3:].strip()
            corpo = []
            i += 1
            while i < len(linhas) and not linhas[i].startswith("```"):
                corpo.append(linhas[i])
                i += 1
            i += 1
            texto = html.escape("\n".join(corpo), quote=False)
            if lang == "mermaid":
                out.append(f'<figure class="diagrama"><pre class="mermaid">{texto}</pre></figure>')
            else:
                out.append(f'<div class="rolagem"><pre class="bloco">{texto}</pre></div>')
            continue
        m = re.match(r"^(#{1,4}) (.*)$", ln)
        if m:
            nivel = len(m.group(1))
            texto = m.group(2)
            i += 1
            if nivel == 1 and primeiro_h1:
                primeiro_h1 = False
                continue  # o título do documento vem da seção
            ident = f"{doc}-{slug(texto)}"
            if nivel == 2:
                titulos.append((ident, re.sub(r"[*`]", "", texto)))
            out.append(f'<h{nivel + 1} id="{ident}">{inline(texto, doc)}</h{nivel + 1}>')
            continue
        if ln.startswith("|") and i + 1 < len(linhas) and re.match(r"^\|[\s:|-]+\|$", linhas[i + 1].strip()):
            cab = celulas(ln)
            i += 2
            corpo = []
            while i < len(linhas) and linhas[i].startswith("|"):
                corpo.append(celulas(linhas[i]))
                i += 1
            th = "".join(f"<th>{inline(c, doc)}</th>" for c in cab)
            trs = "".join(
                "<tr>" + "".join(f"<td>{inline(c, doc)}</td>" for c in r) + "</tr>" for r in corpo
            )
            out.append(f'<div class="rolagem"><table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>')
            continue
        if re.match(r"^\s*[-*] ", ln) or re.match(r"^\s*\d+\. ", ln):
            ordenada = bool(re.match(r"^\s*\d+\. ", ln))
            itens = []
            while i < len(linhas) and (
                re.match(r"^\s*([-*]|\d+\.) ", linhas[i])
                or (linhas[i].startswith("  ") and linhas[i].strip() and itens)
            ):
                if re.match(r"^\s*([-*]|\d+\.) ", linhas[i]):
                    itens.append(re.sub(r"^\s*([-*]|\d+\.) ", "", linhas[i]))
                else:
                    itens[-1] += " " + linhas[i].strip()
                i += 1
            tag = "ol" if ordenada else "ul"
            out.append(f"<{tag}>" + "".join(f"<li>{inline(t, doc)}</li>" for t in itens) + f"</{tag}>")
            continue
        if ln.strip() == "---":
            out.append("<hr>")
            i += 1
            continue
        if not ln.strip():
            i += 1
            continue
        par = [ln]
        i += 1
        while (
            i < len(linhas)
            and linhas[i].strip()
            and not re.match(r"^(#|```|\||\s*[-*] |\s*\d+\. |---$)", linhas[i])
        ):
            par.append(linhas[i])
            i += 1
        out.append(f"<p>{inline(' '.join(p.strip() for p in par), doc)}</p>")
    return "\n".join(out)


secoes = []
nav = []
for chave, nome, arq in DOCS:
    titulos: list = []
    corpo = converter((raiz / arq).read_text(encoding="utf-8"), chave, titulos)
    secoes.append(
        f'<section class="doc" id="{chave}" aria-labelledby="{chave}-t">'
        f'<header class="doc-cab"><span class="rotulo">{html.escape(arq)}</span>'
        f'<h2 id="{chave}-t">{nome}</h2></header>{corpo}</section>'
    )
    sub = "".join(f'<li><a href="#{i}">{html.escape(t)}</a></li>' for i, t in titulos)
    nav.append(f'<li><a class="nav-doc" href="#{chave}">{nome}</a><ul>{sub}</ul></li>')

logo = base64.b64encode((raiz / "docs/design-system/assets/Logos/semed.png").read_bytes()).decode()
modelo = (Path(__file__).parent / "modelo_doc.html").read_text(encoding="utf-8")
pagina = (
    modelo.replace("{{NAV}}", "".join(nav))
    .replace("{{SECOES}}", "\n".join(secoes))
    .replace("{{LOGO}}", f"data:image/png;base64,{logo}")
    .replace("/*{{CSS_DS}}*/", css_tokens() + css_componentes())
    .replace("/*{{JS_DS}}*/", (DS / "components/bundle.js").read_text(encoding="utf-8"))
    .replace("/*{{JS_VITRINE}}*/", (Path(__file__).parent / "vitrine.js").read_text(encoding="utf-8"))
)
saida.write_text(pagina, encoding="utf-8")
print(f"{saida} ({len(pagina) // 1024} KB, {pagina.count('class=\"mermaid\"')} diagramas)")
