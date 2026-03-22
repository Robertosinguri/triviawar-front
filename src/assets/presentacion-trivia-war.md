## 🎯 Arquitectura y Tecnología

```mermaid
flowchart TD
    %% Tres centros principales
    A{🎮 **TRIVIA WAR**<br/>Sistema Multijugador<br/>con IA Generativa}
    B{⚙️ **Angular + Node.js**<br/>Stack Tecnológico<br/>Frontend + Backend}
    C{🏗️ **AWS Cloud Services**<br/>Arquitectura Serverless<br/>Infraestructura Escalable}
    
    %% Satélites Stack Tecnológico
    B1[🎨 **Angular 20 + TypeScript**<br/>Experiencia Usuario<br/>Gaming Neon + Responsive]
    B2[⚡ **Lambda + DynamoDB**<br/>Motor del Juego<br/>Serverless + API REST]
    B3[🤖 **Gemini + Bedrock Claude**<br/>Inteligencia Artificial<br/>IA Híbrida + Fallback]

    %% Satélites Arquitectura AWS
    C1[🌐 **AWS Amplify**<br/>Hosting Inteligente<br/>Deploy + CDN Global]
    C2[🔐 **AWS Cognito**<br/>Autenticación Segura<br/>Usuarios + Sesiones]
    C3[💾 **AWS DynamoDB**<br/>Base de Datos NoSQL<br/>Escalable + Ranking]
    C4[💰 **AWS Lambda + Bedrock**<br/>Costo Operativo<br/>Pay-per-Use Serverless]

    %% Conexiones principales (centros)
    A --> B
    A --> C
    
    %% Conexiones satélites
    B --> B1
    B --> B2
    B --> B3
    
    C --> C1
    C --> C2
    C --> C3
    C --> C4

    %% Espaciado tres centros
    B1 ~~~ B2 ~~~ B3
    C1 ~~~ C2 ~~~ C3 ~~~ C4
    B ~~~ A ~~~ C

    %% Estilos tres centros
    style A fill:#2d3748,stroke:#fc8181,stroke-width:4px,color:#fff
    style B fill:#2d3748,stroke:#63b3ed,stroke-width:3px,color:#fff
    style C fill:#2d3748,stroke:#68d391,stroke-width:3px,color:#fff
    
    style B1 fill:#1a202c,stroke:#4fd1c7,stroke-width:2px,color:#4fd1c7
    style B2 fill:#1a202c,stroke:#63b3ed,stroke-width:2px,color:#63b3ed
    style B3 fill:#1a202c,stroke:#f6ad55,stroke-width:2px,color:#f6ad55
    
    style C1 fill:#1a202c,stroke:#9f7aea,stroke-width:2px,color:#9f7aea
    style C2 fill:#1a202c,stroke:#4fd1c7,stroke-width:2px,color:#4fd1c7
    style C3 fill:#1a202c,stroke:#68d391,stroke-width:2px,color:#68d391
    style C4 fill:#1a202c,stroke:#fc8181,stroke-width:2px,color:#fc8181
```

## 🎮 Flujo de Experiencia de Usuario

### 🖥️ Frontend (Angular 20)

```mermaid
flowchart TD
    %% Centro estrella (Modo de Juego)
    A4{🎯 Modo de Juego<br/>Selección Central}
    
    %% Flujo de entrada (arriba)
    A1[🎆 Splash]
    A2[🔑 Login]
    A3[🏠 Dashboard]
    
    %% Rama Multijugador (izquierda)
    A5[📝 Configurar<br/>Sala]
    A6[🚪 Lobby<br/>Espera]
    A7[⚔️ Arena<br/>Gaming]
    
    %% Rama Individual (derecha)
    A9[🏋️ Entrenar<br/>Práctica]
    A10[🎮 Juego<br/>Individual]
    
    %% Convergencia (abajo)
    A8[🏆 Resultados<br/>Finales]
    A11[🏅 Ranking<br/>Global]
    
    %% Servicios Backend (laterales)
    AUTH[🔐 Cognito<br/>Auth Service]
    API[⚡ Lambda<br/>API Functions]
    
    %% Conexiones estrella - Entrada al centro
    A1 --> A2 --> A3 --> A4
    
    %% Conexiones estrella - Centro a ramas
    A4 -->|Multijugador| A5
    A4 -->|Individual| A9
    
    %% Flujos de ramas
    A5 --> A6 --> A7
    A9 --> A10
    
    %% Convergencia al centro inferior
    A7 --> A8
    A10 --> A8
    A8 --> A11
    
    %% Conexiones Backend (punteadas)
    A2 -.->|Auth| AUTH
    A7 -.->|API| API
    A10 -.->|API| API
    A8 -.->|Stats| API
    
    %% Espaciado estrella
    A5 ~~~ A4 ~~~ A9
    A6 ~~~ A8 ~~~ A10
    AUTH ~~~ A3 ~~~ API
    A7 ~~~ A11
    
    %% Estilos estrella
    style A4 fill:#2d3748,stroke:#f6ad55,stroke-width:4px,color:#fff
    style A7 fill:#2d3748,stroke:#fc8181,stroke-width:2px,color:#fff
    style A10 fill:#2d3748,stroke:#68d391,stroke-width:2px,color:#fff
    style A8 fill:#2d3748,stroke:#9f7aea,stroke-width:2px,color:#fff
    style A3 fill:#2d3748,stroke:#4fd1c7,stroke-width:2px,color:#fff
    style AUTH fill:#1a202c,stroke:#4fd1c7,stroke-width:2px,color:#4fd1c7
    style API fill:#1a202c,stroke:#63b3ed,stroke-width:2px,color:#63b3ed
```

---

### ☁️ Backend (AWS Serverless)

```mermaid
flowchart TB
    B1[🚀 AWS Amplify<br/>Static Hosting] 
    B4[🔐 AWS Cognito<br/>User Management]
    B2[⚡ AWS Lambda<br/>API Functions]
    B3[🗄️ DynamoDB<br/>NoSQL Database]
    B5[🤖 AWS Bedrock<br/>IA Services]
    
    B1 -.->|Deploy| B2
    B4 -.->|Auth| B2
    B2 <--> B3
    B2 -.->|Fallback IA| B5
    B2 -.->|Generar Preguntas| IA[🤖 Sistema IA Híbrido]
    
    style B1 fill:#1a202c,stroke:#f6ad55,stroke-width:2px,color:#f6ad55
    style B2 fill:#2d3748,stroke:#63b3ed,stroke-width:3px,color:#fff
    style B3 fill:#1a202c,stroke:#68d391,stroke-width:2px,color:#68d391
    style B4 fill:#1a202c,stroke:#4fd1c7,stroke-width:2px,color:#4fd1c7
    style B5 fill:#1a202c,stroke:#fc8181,stroke-width:2px,color:#fc8181
    style IA fill:#2d3748,stroke:#f6ad55,stroke-width:2px,color:#fff
```

---

### 🤖 Sistema IA Híbrido

```mermaid
flowchart LR
    %% Nodo central
    REQ[📝 REQUEST IA<br/>Generar Preguntas<br/>Sistema Híbrido]
    
    %% Servicios IA
    C1[🤖 GEMINI 2.0 FLASH<br/>Servicio Primario<br/>GRATIS - 1000 req/min]
    C2[🧠 BEDROCK CLAUDE<br/>Fallback Automático<br/>$0.0007/request]
    
    %% Response
    RES[✅ RESPONSE<br/>Preguntas Generadas<br/>JSON Validado]
    
    %% Conexiones principales
    REQ --> C1
    REQ --> C2
    C1 --> RES
    C2 --> RES
    
    %% Espaciado estrella
    C1 ~~~ C2
    
    %% Estilos estrella
    style REQ fill:#2d3748,stroke:#fc8181,stroke-width:4px,color:#fff
    style C1 fill:#1a202c,stroke:#68d391,stroke-width:2px,color:#68d391
    style C2 fill:#1a202c,stroke:#f6ad55,stroke-width:2px,color:#f6ad55
    style RES fill:#2d3748,stroke:#4fd1c7,stroke-width:3px,color:#fff
```

## 🏠 Armado de Salas Modo Multijugador

```mermaid
flowchart TD
    %% Centro de control (estrella central)
    API{☁️ AWS LAMBDA<br/>Coordinador Central}
    
    %% Jugadores (puntas de estrella)
    J1[👑 HOST<br/>Jugador 1]
    J2[👤 INVITADO<br/>Jugador 2] 
    J3[👤 INVITADO<br/>Jugador 3]
    J4[👤 INVITADO<br/>Jugador 4]
    
    %% Servicios (puntas inferiores)
    DB[🗄️ DynamoDB<br/>Estado Sala]
    IA1[🤖 GEMINI<br/>IA Primaria]
    IA2[🧠 BEDROCK<br/>IA Backup]
    
    %% Conexiones estrella - Jugadores al centro
    J1 <-->|HTTP Polling<br/>cada 5s| API
    J2 <-->|HTTP Polling<br/>cada 5s| API
    J3 <-->|HTTP Polling<br/>cada 5s| API
    J4 <-->|HTTP Polling<br/>cada 5s| API
    
    %% Conexiones estrella - Centro a servicios
    API <-->|CRUD<br/>Operations| DB
    API -->|Generate<br/>Questions| IA1
    IA1 -.->|Fallback| IA2
    
    %% Espaciado estrella
    J1 ~~~ J2 ~~~ J3 ~~~ J4
    DB ~~~ IA1 ~~~ IA2
    J2 ~~~ API ~~~ J3
    
    %% Estilos gaming oscuros
    style API fill:#2d3748,stroke:#f6ad55,stroke-width:4px,color:#fff
    style J1 fill:#2d3748,stroke:#fc8181,stroke-width:3px,color:#fff
    style J2 fill:#1a202c,stroke:#4fd1c7,stroke-width:2px,color:#4fd1c7
    style J3 fill:#1a202c,stroke:#4fd1c7,stroke-width:2px,color:#4fd1c7
    style J4 fill:#1a202c,stroke:#4fd1c7,stroke-width:2px,color:#4fd1c7
    style DB fill:#1a202c,stroke:#68d391,stroke-width:2px,color:#68d391
    style IA1 fill:#1a202c,stroke:#9f7aea,stroke-width:2px,color:#9f7aea
    style IA2 fill:#1a202c,stroke:#f6ad55,stroke-width:2px,color:#f6ad55
```

