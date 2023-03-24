import { Vexile } from '@haechi/flexile'
import { styled } from 'incart-fe-common'
import { Outlet, useLocation } from 'react-router-dom'

import { Sidebar } from '@/components'
import { globalCss } from 'incart-fe-common/dist/stitches.config'

const ContentWrapper = styled(Vexile, {
    margin: '18rem auto',
    maxWidth: '180rem',
    '@tablet': {
        maxWidth: 'unset',
        margin: 'unset',
        flex: 1,
    },
})

const BodyWrapper = styled('div', {
    '@tablet': {
        display: 'flex',
        padding: '15rem 12rem',
        gap: '8rem',
    },
})

export default () => {
    const location = useLocation()
    const showLayout = !location.pathname.startsWith('/login')

    return showLayout ? (
        <BodyWrapper>
            <Sidebar
                css={{
                    position: 'fixed',
                    left: '15rem',
                    top: '18rem',
                    '@tablet': {
                        position: 'initial',
                        left: 'unset',
                        top: 'unset',
                    },
                }}
            />
            <ContentWrapper gap={6}>
                <Outlet />
            </ContentWrapper>
        </BodyWrapper>
    ) : (
        <Outlet />
    )
}
