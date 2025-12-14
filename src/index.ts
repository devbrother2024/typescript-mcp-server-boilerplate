import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

// 서버 인스턴스 생성
const server = new McpServer({
    name: 'my-mcp-server',
    version: '1.0.0'
})

server.registerTool(
    'greet',
    {
        description: '이름과 언어를 입력하면 인사말을 반환합니다.',
        inputSchema: z.object({
            name: z.string().describe('인사할 사람의 이름'),
            language: z
                .enum(['ko', 'en'])
                .optional()
                .default('en')
                .describe('인사 언어 (기본값: en)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('인사말')
                    })
                )
                .describe('인사말')
        })
    },
    async ({ name, language }) => {
        const greeting =
            language === 'ko'
                ? `안녕하세요, ${name}님!`
                : `Hey there, ${name}! 👋 Nice to meet you!`

        return {
            content: [
                {
                    type: 'text' as const,
                    text: greeting
                }
            ],
            structuredContent: {
                content: [
                    {
                        type: 'text' as const,
                        text: greeting
                    }
                ]
            }
        }
    }
)

server.registerTool(
    'calculator',
    {
        description:
            '두 개의 숫자와 연산자를 입력받아 사칙연산을 수행하고 결과를 반환합니다.',
        inputSchema: z.object({
            a: z.number().describe('첫 번째 숫자'),
            b: z.number().describe('두 번째 숫자'),
            operator: z
                .enum(['+', '-', '*', '/'])
                .describe('연산자 (+, -, *, /)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('계산 결과')
                    })
                )
                .describe('계산 결과')
        })
    },
    async ({ a, b, operator }) => {
        let result: number
        let operationSymbol: string

        switch (operator) {
            case '+':
                result = a + b
                operationSymbol = '+'
                break
            case '-':
                result = a - b
                operationSymbol = '-'
                break
            case '*':
                result = a * b
                operationSymbol = '×'
                break
            case '/':
                if (b === 0) {
                    throw new Error('0으로 나눌 수 없습니다')
                }
                result = a / b
                operationSymbol = '÷'
                break
            default:
                throw new Error('지원하지 않는 연산자입니다')
        }

        const resultText = `${a} ${operationSymbol} ${b} = ${result}`

        return {
            content: [
                {
                    type: 'text' as const,
                    text: resultText
                }
            ],
            structuredContent: {
                content: [
                    {
                        type: 'text' as const,
                        text: resultText
                    }
                ]
            }
        }
    }
)

server.registerTool(
    'get-time',
    {
        description:
            'timezone을 입력받아 해당 timezone의 현재 시간을 반환합니다.',
        inputSchema: z.object({
            timezone: z
                .string()
                .describe(
                    'IANA timezone 식별자 (예: Asia/Seoul, America/New_York, Europe/London, UTC)'
                )
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('현재 시간')
                    })
                )
                .describe('현재 시간')
        })
    },
    async ({ timezone }) => {
        try {
            const now = new Date()
            const formatter = new Intl.DateTimeFormat('ko-KR', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            })

            const formattedTime = formatter.format(now)
            const resultText = `${timezone}의 현재 시간: ${formattedTime}`

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: resultText
                    }
                ],
                structuredContent: {
                    content: [
                        {
                            type: 'text' as const,
                            text: resultText
                        }
                    ]
                }
            }
        } catch (error) {
            throw new Error(
                `유효하지 않은 timezone입니다: ${timezone}. IANA timezone 식별자를 사용해주세요 (예: Asia/Seoul, America/New_York)`
            )
        }
    }
)

server.registerTool(
    'geocode',
    {
        description:
            '도시 이름이나 주소를 입력받아 Nominatim OpenStreetMap API를 사용하여 위도와 경도 좌표를 반환합니다.',
        inputSchema: z.object({
            query: z
                .string()
                .describe(
                    '검색할 도시 이름이나 주소 (예: "서울", "Seoul, South Korea", "New York City")'
                ),
            limit: z
                .number()
                .int()
                .min(1)
                .max(10)
                .optional()
                .default(1)
                .describe('반환할 최대 결과 수 (기본값: 1)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('위도와 경도 좌표 정보')
                    })
                )
                .describe('위도와 경도 좌표 정보')
        })
    },
    async ({ query, limit }) => {
        try {
            const baseUrl = 'https://nominatim.openstreetmap.org/search'
            const params = new URLSearchParams({
                q: query,
                format: 'jsonv2',
                limit: limit.toString(),
                addressdetails: '1'
            })

            const url = `${baseUrl}?${params.toString()}`
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'MCP-Server/1.0.0'
                }
            })

            if (!response.ok) {
                throw new Error(
                    `Nominatim API 요청 실패: ${response.status} ${response.statusText}`
                )
            }

            const data = await response.json()

            if (!Array.isArray(data) || data.length === 0) {
                return {
                    content: [
                        {
                            type: 'text' as const,
                            text: `"${query}"에 대한 검색 결과를 찾을 수 없습니다.`
                        }
                    ],
                    structuredContent: {
                        content: [
                            {
                                type: 'text' as const,
                                text: `"${query}"에 대한 검색 결과를 찾을 수 없습니다.`
                            }
                        ]
                    }
                }
            }

            const results = data.map((result: any) => {
                const lat = parseFloat(result.lat)
                const lon = parseFloat(result.lon)
                const displayName = result.display_name || query

                return {
                    query: query,
                    displayName: displayName,
                    latitude: lat,
                    longitude: lon,
                    placeId: result.place_id,
                    address: result.address || {}
                }
            })

            let resultText = `"${query}" 검색 결과:\n\n`
            results.forEach((result: any, index: number) => {
                resultText += `${index + 1}. ${result.displayName}\n`
                resultText += `   위도: ${result.latitude}\n`
                resultText += `   경도: ${result.longitude}\n`
                if (index < results.length - 1) {
                    resultText += '\n'
                }
            })

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: resultText
                    }
                ],
                structuredContent: {
                    content: [
                        {
                            type: 'text' as const,
                            text: resultText
                        }
                    ]
                }
            }
        } catch (error) {
            throw new Error(
                `Geocoding 오류: ${
                    error instanceof Error
                        ? error.message
                        : '알 수 없는 오류가 발생했습니다'
                }`
            )
        }
    }
)

server.registerTool(
    'get-weather',
    {
        description:
            '위도와 경도 좌표를 입력받아 Open-Meteo Weather API를 사용하여 해당 위치의 현재 날씨와 예보 정보를 제공합니다.',
        inputSchema: z.object({
            latitude: z.number().min(-90).max(90).describe('위도 (-90 ~ 90)'),
            longitude: z
                .number()
                .min(-180)
                .max(180)
                .describe('경도 (-180 ~ 180)'),
            forecastDays: z
                .number()
                .int()
                .min(1)
                .max(16)
                .optional()
                .default(3)
                .describe('예보 일수 (기본값: 3, 최대: 16)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('날씨 정보')
                    })
                )
                .describe('날씨 정보')
        })
    },
    async ({ latitude, longitude, forecastDays }) => {
        try {
            const baseUrl = 'https://api.open-meteo.com/v1/forecast'
            const params = new URLSearchParams({
                latitude: latitude.toString(),
                longitude: longitude.toString(),
                current_weather: 'true',
                hourly: 'temperature_2m,precipitation,wind_speed_10m,weather_code',
                daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
                forecast_days: forecastDays.toString(),
                timezone: 'auto'
            })

            const url = `${baseUrl}?${params.toString()}`
            const response = await fetch(url)

            if (!response.ok) {
                throw new Error(
                    `Open-Meteo API 요청 실패: ${response.status} ${response.statusText}`
                )
            }

            const data = await response.json()

            if (!data || !data.current_weather) {
                throw new Error('날씨 데이터를 가져올 수 없습니다')
            }

            const current = data.current_weather
            const daily = data.daily
            const hourly = data.hourly

            // 날씨 코드를 설명으로 변환하는 함수
            const getWeatherDescription = (
                code: number | undefined
            ): string => {
                if (code === undefined || code === null) {
                    return '정보 없음'
                }
                const weatherCodes: { [key: number]: string } = {
                    0: '맑음',
                    1: '대체로 맑음',
                    2: '부분적으로 흐림',
                    3: '흐림',
                    45: '안개',
                    48: '서리 안개',
                    51: '약한 이슬비',
                    53: '보통 이슬비',
                    55: '강한 이슬비',
                    56: '약한 동결 이슬비',
                    57: '강한 동결 이슬비',
                    61: '약한 비',
                    63: '보통 비',
                    65: '강한 비',
                    66: '약한 동결 비',
                    67: '강한 동결 비',
                    71: '약한 눈',
                    73: '보통 눈',
                    75: '강한 눈',
                    77: '눈알갱이',
                    80: '약한 소나기',
                    81: '보통 소나기',
                    82: '강한 소나기',
                    85: '약한 눈 소나기',
                    86: '강한 눈 소나기',
                    95: '뇌우',
                    96: '우박을 동반한 뇌우',
                    99: '강한 우박을 동반한 뇌우'
                }
                return weatherCodes[code] || `코드 ${code}`
            }

            // current_weather 객체의 필드명이 다를 수 있으므로 여러 가능성을 확인
            const weatherCode = current.weathercode ?? current.weather_code
            const windSpeed =
                current.windspeed ?? current.windspeed_10m ?? current.wind_speed
            const windDirection =
                current.winddirection ?? current.wind_direction

            let resultText = `📍 위치: 위도 ${latitude}, 경도 ${longitude}\n\n`
            resultText += `🌡️ 현재 날씨\n`
            resultText += `   온도: ${current.temperature ?? 'N/A'}°C\n`
            resultText += `   날씨: ${getWeatherDescription(weatherCode)}\n`
            resultText += `   풍속: ${windSpeed ?? 'N/A'} km/h\n`
            resultText += `   풍향: ${windDirection ?? 'N/A'}°\n\n`

            if (daily && daily.time && daily.time.length > 0) {
                resultText += `📅 ${forecastDays}일 예보\n\n`
                for (
                    let i = 0;
                    i < Math.min(forecastDays, daily.time.length);
                    i++
                ) {
                    const date = new Date(daily.time[i])
                    const dateStr = date.toLocaleDateString('ko-KR', {
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short'
                    })
                    const dailyWeatherCode =
                        daily.weathercode?.[i] ?? daily.weather_code?.[i]
                    resultText += `${dateStr}\n`
                    resultText += `   최고: ${
                        daily.temperature_2m_max?.[i] ?? 'N/A'
                    }°C\n`
                    resultText += `   최저: ${
                        daily.temperature_2m_min?.[i] ?? 'N/A'
                    }°C\n`
                    resultText += `   강수량: ${
                        daily.precipitation_sum?.[i] ?? 'N/A'
                    } mm\n`
                    resultText += `   날씨: ${getWeatherDescription(
                        dailyWeatherCode
                    )}\n`
                    if (i < Math.min(forecastDays, daily.time.length) - 1) {
                        resultText += '\n'
                    }
                }
            }

            return {
                content: [
                    {
                        type: 'text' as const,
                        text: resultText
                    }
                ],
                structuredContent: {
                    content: [
                        {
                            type: 'text' as const,
                            text: resultText
                        }
                    ]
                }
            }
        } catch (error) {
            throw new Error(
                `날씨 정보 조회 오류: ${
                    error instanceof Error
                        ? error.message
                        : '알 수 없는 오류가 발생했습니다'
                }`
            )
        }
    }
)

// 서버 정보 리소스
server.registerResource(
    'server-info',
    'mcp://server-info',
    {
        description: 'MCP 서버의 현재 상태 및 시스템 정보',
        mimeType: 'application/json'
    },
    async () => {
        const serverInfo = {
            server: 'my-mcp-server',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            nodeVersion: process.version,
            platform: process.platform,
            tools: [
                {
                    name: 'greet',
                    description: '이름과 언어를 입력하면 인사말을 반환합니다.'
                },
                {
                    name: 'calculator',
                    description:
                        '두 개의 숫자와 연산자를 입력받아 사칙연산을 수행하고 결과를 반환합니다.'
                },
                {
                    name: 'get-time',
                    description:
                        'timezone을 입력받아 해당 timezone의 현재 시간을 반환합니다.'
                },
                {
                    name: 'geocode',
                    description:
                        '도시 이름이나 주소를 입력받아 위도와 경도 좌표를 반환합니다.'
                },
                {
                    name: 'get-weather',
                    description:
                        '위도와 경도 좌표를 입력받아 현재 날씨와 예보 정보를 제공합니다.'
                }
            ]
        }

        return {
            contents: [
                {
                    uri: 'mcp://server-info',
                    mimeType: 'application/json',
                    text: JSON.stringify(serverInfo, null, 2)
                }
            ]
        }
    }
)

server
    .connect(new StdioServerTransport())
    .catch(console.error)
    .then(() => {
        console.log('MCP server started')
    })
