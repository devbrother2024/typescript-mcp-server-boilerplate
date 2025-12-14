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

server
    .connect(new StdioServerTransport())
    .catch(console.error)
    .then(() => {
        console.log('MCP server started')
    })
