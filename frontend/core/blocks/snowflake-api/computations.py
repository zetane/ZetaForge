import snowflake.connector

def compute(user, password, database, schema, query):
    '''Fetch data from a Snowflake instance using the provided credentials and query.'''
    
    conn = snowflake.connector.connect(
        user=user,
        password=password,
        account='',
        database=database,
        schema=schema
    )

    cursor = conn.cursor()
    cursor.execute(query)
    result = cursor.fetchall()

    cursor.close()
    conn.close()

    return {'result': result}


def test():
    """Test the compute function."""

    print("Running test")
