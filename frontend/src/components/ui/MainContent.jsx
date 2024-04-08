import { Column, Content, Grid } from "@carbon/react";

export default function MainContent({ children }) {
  return (
    <Content>
      <Grid condensed={true} fullWidth={true}>
        <Column sm={{ span: 4 }} md={{ span: 8 }} lg={{ span: 16 }}>
          {children}
        </Column>
      </Grid>
    </Content>
  );
}
