'use client'

import { Content, Grid, Column } from "@carbon/react"

export default function MainContent({ children }) {
  return (
    <Content id="main-content" className="">
      <Grid condensed={true} fullWidth={true}>
        <Column sm={{ span: 4 }} md={{ span: 8 }} lg={{ span: 16 }}>
          {children}
        </Column>
      </Grid>
    </Content>
  )
}